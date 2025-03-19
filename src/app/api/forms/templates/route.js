import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { FormTemplate, FormSubmission, User } from "@/lib/mariadb/models";

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
      
      // Get creators information separately
      const templatesWithCreators = await Promise.all(
        templates.map(async (template) => {
          const plainTemplate = template.get({ plain: true });
          
          try {
            const creator = await User.findByPk(template.created_by, {
              attributes: ['id', 'name', 'email']
            });
            
            return {
              ...plainTemplate,
              creator: creator ? creator.get({ plain: true }) : null
            };
          } catch (error) {
            return plainTemplate;
          }
        })
      );
      
      return NextResponse.json(templatesWithCreators);
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
    
    // Create with a simpler approach to avoid potential issues
    const template = await FormTemplate.create({
      name,
      fields: JSON.stringify(fields), // Explicitly stringify fields
      created_by: session.user.id
    });
    
    console.log("Template created successfully:", template.id);
    
    return NextResponse.json(
      { message: "Template created successfully", template },
      { status: 201 }
    );
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
    
    // Update the template
    await existingTemplate.update({
      name,
      fields: JSON.stringify(fields)
    });
    
    return NextResponse.json({ 
      message: "Template updated successfully", 
      template: existingTemplate
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
    
    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting form template:", error);
    return NextResponse.json(
      { message: "Error deleting template", error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
