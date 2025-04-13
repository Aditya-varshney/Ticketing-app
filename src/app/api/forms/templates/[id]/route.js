import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { FormTemplate } from "@/lib/mariadb/models";

// Make this route dynamic to ensure we always get fresh data
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    console.log("Fetching template with ID:", id);
    
    // Connect to database
    await connectToDatabase();
    
    // Find the template
    const template = await FormTemplate.findByPk(id);
    
    if (!template) {
      console.log("Template not found for ID:", id);
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 }
      );
    }
    
    // Parse fields if they are stored as a string
    let parsedFields = [];
    try {
      if (typeof template.fields === 'string') {
        parsedFields = JSON.parse(template.fields);
      } else if (Array.isArray(template.fields)) {
        parsedFields = template.fields;
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
      
      console.log("Processed fields for template:", parsedFields);
      
    } catch (error) {
      console.error("Error parsing template fields:", error);
      parsedFields = [];
    }
    
    return NextResponse.json({
      template: {
        ...template.get({ plain: true }),
        fields: parsedFields
      }
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { message: "Error fetching template", error: error.message },
      { status: 500 }
    );
  }
} 