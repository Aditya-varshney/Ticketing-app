import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { FormTemplate, FormSubmission, User } from "@/lib/mariadb/models";
import { v4 as uuidv4 } from 'uuid';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Get all form templates or filtered by role
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();
    
    // Get user role
    const user = await User.findByPk(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');
    
    // If an ID is provided, return that specific template
    if (templateId) {
      console.log("Fetching template with ID:", templateId);
      
      try {
        // First try simple query without associations
        const template = await FormTemplate.findByPk(templateId);
        
        if (!template) {
          return NextResponse.json(
            { message: "Template not found" },
            { status: 404 }
          );
        }
        
        // Get creator information separately to avoid any association issues
        let creator = null;
        try {
          creator = await User.findByPk(template.created_by, {
            attributes: ['id', 'name', 'email']
          });
        } catch (creatorError) {
          console.error("Error fetching template creator:", creatorError);
          // Continue without creator info
        }
        
        // Manually construct response to avoid any serialization issues
        const response = {
          ...template.get({ plain: true }),
          creator: creator ? creator.get({ plain: true }) : null
        };
        
        return NextResponse.json(response);
      } catch (templateError) {
        console.error("Error fetching specific template:", templateError);
        return NextResponse.json(
          { message: "Error retrieving template", error: templateError.message },
          { status: 500 }
        );
      }
    }
    
    // Otherwise return all templates
    try {
      const templates = await FormTemplate.findAll({
        order: [['created_at', 'DESC']]
      });
      
      // Process templates to parse fields
      const processedTemplates = templates.map(template => {
        const plainTemplate = template.get({ plain: true });
        let parsedFields = [];
        
        try {
          if (typeof plainTemplate.fields === 'string') {
            parsedFields = JSON.parse(plainTemplate.fields);
          } else if (Array.isArray(plainTemplate.fields)) {
            parsedFields = plainTemplate.fields;
          }
          
          // Process fields to handle dropdown options
          parsedFields = parsedFields.map(field => {
            if (field.type === 'select' && field.options) {
              // Ensure options are in string format
              if (typeof field.options !== 'string') {
                field.options = String(field.options);
              }
              
              // Clean up options format
              const cleanOptions = field.options
                .split(',')
                .map(opt => opt.trim())
                .filter(opt => opt !== '')
                .join(', ');
                
              return {
                ...field,
                options: cleanOptions
              };
            }
            return field;
          });
          
        } catch (error) {
          console.error(`Error parsing fields for template ${plainTemplate.id}:`, error);
          parsedFields = [];
        }
        
        return {
          ...plainTemplate,
          fields: parsedFields
        };
      });
      
      return NextResponse.json({ templates: processedTemplates });
    } catch (listError) {
      console.error("Error listing all templates:", listError);
      return NextResponse.json(
        { message: "Error listing templates", error: listError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching form templates:", error);
    return NextResponse.json(
      { message: "Error fetching templates", error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

// Process fields to ensure proper format
const processFields = (fields) => {
  if (!fields || !Array.isArray(fields)) return [];
  
  return fields.map(field => {
    // Handle dropdown/select type fields
    if (field.type === 'select') {
      // Ensure options exists and is properly formatted
      if (!field.options) {
        field.options = '';
      } else if (typeof field.options !== 'string') {
        // If options came in non-string format, convert to string
        field.options = String(field.options);
      }
      
      // Clean up options - remove empty entries, trim whitespace
      const cleanOptions = field.options
        .split(',')
        .map(opt => opt.trim())
        .filter(opt => opt !== '')
        .join(', ');
      
      return {
        ...field,
        options: cleanOptions
      };
    }
    
    return field;
  });
};

// Create a new form template
export async function POST(request) {
  try {
    console.log("POST /api/forms/templates - Starting request");
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();
    console.log("Database connection established");
    
    // Verify admin role
    const admin = await User.findByPk(session.user.id);
    console.log("Admin user found:", admin?.id, admin?.role);
    
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { message: "Only admins can create form templates" },
        { status: 403 }
      );
    }
    
    let data;
    try {
      data = await request.json();
      console.log("Request body parsed:", {
        name: data.name,
        fieldsCount: data.fields?.length || 0
      });
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { message: "Invalid request body", error: parseError.message },
        { status: 400 }
      );
    }
    
    const { name, fields } = data;
    
    if (!name || !fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { message: "Name and at least one field are required" },
        { status: 400 }
      );
    }
    
    // Generate a new ID for the template
    const templateId = uuidv4();
    
    // Process fields to ensure they have all required properties
    const processedFields = processFields(fields);
    
    // Create the template
    const template = await FormTemplate.create({
      id: templateId,
      name,
      fields: JSON.stringify(processedFields),
      created_by: session.user.id
    });
    
    console.log("Template created successfully:", template.id);
    
    return NextResponse.json({
      message: "Form template created successfully",
      template: {
        ...template.get({ plain: true }),
        fields: processedFields
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating form template:", error);
    console.error("Error stack:", error.stack);
    
    // Provide a simplified response with the error details
    return NextResponse.json(
      { 
        message: "Error creating template", 
        error: error.message,
        errorName: error.name,
      },
      { status: 500 }
    );
  }
}

// Update an existing form template
export async function PUT(request) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();
    
    // Verify admin role
    const admin = await User.findByPk(session.user.id);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { message: "Only admins can update form templates" },
        { status: 403 }
      );
    }
    
    // Get the template ID from query params
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');
    
    if (!templateId) {
      return NextResponse.json(
        { message: "Template ID is required" },
        { status: 400 }
      );
    }
    
    // Find the existing template
    const existingTemplate = await FormTemplate.findByPk(templateId);
    if (!existingTemplate) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 }
      );
    }
    
    // Parse the request body
    const data = await request.json();
    const { name, fields } = data;
    
    if (!name || !fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { message: "Name and at least one field are required" },
        { status: 400 }
      );
    }
    
    // Process fields to ensure they have all required properties
    const processedFields = processFields(fields);
    
    // Update the template
    existingTemplate.name = name;
    existingTemplate.fields = JSON.stringify(processedFields);
    await existingTemplate.save();
    
    return NextResponse.json({
      message: "Form template updated successfully",
      template: {
        ...existingTemplate.get({ plain: true }),
        fields: processedFields
      }
    });
  } catch (error) {
    console.error("Error updating form template:", error);
    return NextResponse.json(
      { 
        message: "Error updating template", 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Delete a form template
export async function DELETE(request) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');
    
    if (!templateId) {
      return NextResponse.json(
        { message: "Template ID is required" },
        { status: 400 }
      );
    }
    
    // Verify admin role
    const admin = await User.findByPk(session.user.id);
    
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { message: "Only admins can delete form templates" },
        { status: 403 }
      );
    }
    
    // Skip password verification since we've already confirmed the user is an admin
    // through NextAuth session. This is more secure than passing passwords in URLs.
    
    // Find the template
    const template = await FormTemplate.findByPk(templateId);
    if (!template) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 }
      );
    }
    
    // Check if there are any submissions using this template
    try {
      // Make sure FormSubmission is properly imported
      if (!FormSubmission) {
        throw new Error("FormSubmission model not available");
      }
      
      const submissionCount = await FormSubmission.count({
        where: { form_template_id: templateId }
      });
      
      if (submissionCount > 0) {
        return NextResponse.json(
          { message: "Cannot delete template with existing submissions. Archive it instead." },
          { status: 400 }
        );
      }
    } catch (countError) {
      console.error("Error checking submissions:", countError);
      // Continue with deletion even if we can't check submissions
    }
    
    // Delete the template
    await template.destroy();
    
    return NextResponse.json({ message: "Form template deleted successfully" });
  } catch (error) {
    console.error("Error deleting form template:", error);
    return NextResponse.json(
      { message: "Error deleting template", error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
