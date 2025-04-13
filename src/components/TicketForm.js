// Helper function to parse options string into array
const parseOptions = (optionsString) => {
  if (!optionsString) return [];
  return optionsString
    .split(',')
    .map(opt => opt.trim())
    .filter(opt => opt !== '');
};

const TicketForm = ({ formTemplateId }) => {
  // ... existing code ...

  useEffect(() => {
    const fetchFormTemplate = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/forms/templates/${formTemplateId}`);
        const data = await response.json();

        if (response.ok) {
          let templateFields = [];
          
          // Process fields from the template
          if (typeof data.template.fields === 'string') {
            try {
              templateFields = JSON.parse(data.template.fields);
            } catch (e) {
              console.error("Error parsing template fields:", e);
              templateFields = [];
            }
          } else if (Array.isArray(data.template.fields)) {
            templateFields = data.template.fields;
          }
          
          setFormTemplate({
            ...data.template,
            fields: templateFields
          });
          
          // Initialize form values based on fields
          const initialValues = {};
          templateFields.forEach(field => {
            initialValues[field.label] = field.type === 'checkbox' ? false : '';
          });
          
          setFormValues(initialValues);
        } else {
          setError(data.message || "Failed to fetch form template.");
        }
      } catch (error) {
        console.error("Error fetching form template:", error);
        setError("An error occurred while fetching the form template.");
      } finally {
        setLoading(false);
      }
    };

    if (formTemplateId) {
      fetchFormTemplate();
    }
  }, [formTemplateId]);

  // ... existing code ...

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center py-4">{error}</div>
      ) : formTemplate ? (
        <>
          <h2 className="text-xl font-semibold mb-6">{formTemplate.name}</h2>
          
          <form onSubmit={handleSubmit}>
            {formTemplate.fields.map((field, index) => (
              <div key={index} className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                
                {field.type === "text" && (
                  <input
                    type="text"
                    name={field.label}
                    value={formValues[field.label] || ""}
                    onChange={handleInputChange}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    required={field.required}
                  />
                )}
                
                {field.type === "textarea" && (
                  <textarea
                    name={field.label}
                    value={formValues[field.label] || ""}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    required={field.required}
                  ></textarea>
                )}
                
                {field.type === "number" && (
                  <input
                    type="number"
                    name={field.label}
                    value={formValues[field.label] || ""}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    required={field.required}
                  />
                )}
                
                {field.type === "date" && (
                  <input
                    type="date"
                    name={field.label}
                    value={formValues[field.label] || ""}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    required={field.required}
                  />
                )}
                
                {field.type === "select" && (
                  <select
                    name={field.label}
                    value={formValues[field.label] || ""}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    required={field.required}
                  >
                    <option value="">Select an option</option>
                    {parseOptions(field.options).map((option, i) => (
                      <option key={i} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
                
                {field.type === "checkbox" && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name={field.label}
                      checked={formValues[field.label] || false}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 border rounded mr-2"
                      required={field.required}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {field.checkboxLabel || "Yes"}
                    </span>
                  </div>
                )}
              </div>
            ))}
            
            {success && (
              <div className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 p-3 rounded mb-4">
                {success}
              </div>
            )}
            
            {submitError && (
              <div className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 p-3 rounded mb-4">
                {submitError}
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center">
                    <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                    Submitting...
                  </span>
                ) : (
                  "Submit Ticket"
                )}
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="text-center py-4">No form template found.</div>
      )}
    </div>
  );
};

export default TicketForm; 