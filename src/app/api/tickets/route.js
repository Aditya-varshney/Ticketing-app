// Create a new ticket
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Get request body
    const body = await request.json();
    
    const { title, description, form_template_id, form_data, priority = 'medium', type } = body;
    
    // Validate required fields
    if (!title || (!description && !form_data)) {
      return NextResponse.json(
        { message: "Title and either description or form data are required" },
        { status: 400 }
      );
    }
    
    // Validate form template if form_template_id is provided
    if (form_template_id) {
      const template = await FormTemplate.findByPk(form_template_id);
      if (!template) {
        return NextResponse.json(
          { message: "Form template not found" },
          { status: 404 }
        );
      }
      
      // Validate form data against template fields
      let templateFields = [];
      try {
        if (typeof template.fields === 'string') {
          templateFields = JSON.parse(template.fields);
        } else if (Array.isArray(template.fields)) {
          templateFields = template.fields;
        }
        
        // Process form data before storing
        const processedFormData = {};
        
        if (form_data && typeof form_data === 'object') {
          Object.keys(form_data).forEach(key => {
            const field = templateFields.find(f => f.label === key);
            if (field) {
              // Handle different field types
              if (field.type === 'checkbox') {
                // Convert checkbox value to boolean
                processedFormData[key] = !!form_data[key];
              } else if (field.type === 'select') {
                // Validate select field value against options
                const options = field.options
                  ? field.options.split(',').map(opt => opt.trim()).filter(opt => opt !== '')
                  : [];
                
                if (options.length > 0 && !options.includes(form_data[key])) {
                  return NextResponse.json(
                    { message: `Invalid value for ${key}. Must be one of: ${options.join(', ')}` },
                    { status: 400 }
                  );
                }
                
                processedFormData[key] = form_data[key];
              } else {
                // For other field types, just pass the value through
                processedFormData[key] = form_data[key];
              }
            }
          });
        }
        
        // Create the ticket
        const ticket = await Ticket.create({
          title,
          description: description || '',
          status: 'open',
          priority,
          created_by: session.user.id,
          form_template_id: form_template_id || null,
          form_data: JSON.stringify(processedFormData),
          type: type || null
        });
        
        return NextResponse.json({
          message: "Ticket created successfully",
          ticket: ticket.get({ plain: true })
        }, { status: 201 });
      } catch (error) {
        console.error("Error validating or creating ticket:", error);
        return NextResponse.json(
          { message: "Error creating ticket", error: error.message },
          { status: 500 }
        );
      }
    } else {
      // Create a basic ticket without form data
      const ticket = await Ticket.create({
        title,
        description,
        status: 'open',
        priority,
        created_by: session.user.id,
        type: type || null
      });
      
      return NextResponse.json({
        message: "Ticket created successfully",
        ticket: ticket.get({ plain: true })
      }, { status: 201 });
    }
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { message: "Error creating ticket", error: error.message },
      { status: 500 }
    );
  }
} 