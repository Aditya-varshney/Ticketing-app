-- Insert admin users
INSERT INTO users (id, email, name, password, role, profile_image) VALUES
('admin1-uuid', 'admin1@example.com', 'Admin1', '$2b$10$zqv8.szUEQBLnLQRZBQQWOtYqzYTqwI3yqRBYKBBF1P8LxGAX9wDm', 'admin', 'https://ui-avatars.com/api/?name=Admin1'),
('admin2-uuid', 'admin2@example.com', 'Admin2', '$2b$10$zqv8.szUEQBLnLQRZBQQWOtYqzYTqwI3yqRBYKBBF1P8LxGAX9wDm', 'admin', 'https://ui-avatars.com/api/?name=Admin2');

-- Insert helpdesk users
INSERT INTO users (id, email, name, password, role, profile_image) VALUES
('helpdesk1-uuid', 'helpdesk1@example.com', 'Helpdesk1', '$2b$10$zqv8.szUEQBLnLQRZBQQWOtYqzYTqwI3yqRBYKBBF1P8LxGAX9wDm', 'helpdesk', 'https://ui-avatars.com/api/?name=Helpdesk1'),
('helpdesk2-uuid', 'helpdesk2@example.com', 'Helpdesk2', '$2b$10$zqv8.szUEQBLnLQRZBQQWOtYqzYTqwI3yqRBYKBBF1P8LxGAX9wDm', 'helpdesk', 'https://ui-avatars.com/api/?name=Helpdesk2'),
('helpdesk3-uuid', 'helpdesk3@example.com', 'Helpdesk3', '$2b$10$zqv8.szUEQBLnLQRZBQQWOtYqzYTqwI3yqRBYKBBF1P8LxGAX9wDm', 'helpdesk', 'https://ui-avatars.com/api/?name=Helpdesk3');

-- Insert regular users
INSERT INTO users (id, email, name, password, role, profile_image) VALUES
('user1-uuid', 'user1@example.com', 'Aditya', '$2b$10$zqv8.szUEQBLnLQRZBQQWOtYqzYTqwI3yqRBYKBBF1P8LxGAX9wDm', 'user', 'https://ui-avatars.com/api/?name=Aditya'),
('user2-uuid', 'user2@example.com', 'Tejas', '$2b$10$zqv8.szUEQBLnLQRZBQQWOtYqzYTqwI3yqRBYKBBF1P8LxGAX9wDm', 'user', 'https://ui-avatars.com/api/?name=Tejas'),
('user3-uuid', 'user3@example.com', 'Farhan', '$2b$10$zqv8.szUEQBLnLQRZBQQWOtYqzYTqwI3yqRBYKBBF1P8LxGAX9wDm', 'user', 'https://ui-avatars.com/api/?name=Farhan'),
('user4-uuid', 'user4@example.com', 'Vedant', '$2b$10$zqv8.szUEQBLnLQRZBQQWOtYqzYTqwI3yqRBYKBBF1P8LxGAX9wDm', 'user', 'https://ui-avatars.com/api/?name=Vedant'),
('user5-uuid', 'user5@example.com', 'Soumojit', '$2b$10$zqv8.szUEQBLnLQRZBQQWOtYqzYTqwI3yqRBYKBBF1P8LxGAX9wDm', 'user', 'https://ui-avatars.com/api/?name=Soumojit');

-- Insert form templates
INSERT INTO form_templates (id, name, fields, created_by) VALUES
('template1-uuid', 'IT Support Request', '{"fields":[{"name":"issue","label":"Issue Description","type":"textarea","required":true},{"name":"priority","label":"Priority","type":"select","options":["low","medium","high","urgent"],"required":true}]}', 'admin1-uuid'),
('template2-uuid', 'Bug Report', '{"fields":[{"name":"title","label":"Bug Title","type":"text","required":true},{"name":"description","label":"Description","type":"textarea","required":true},{"name":"steps","label":"Steps to Reproduce","type":"textarea","required":true}]}', 'admin1-uuid');

-- Insert some form submissions
INSERT INTO form_submissions (id, form_template_id, submitted_by, form_data, status, priority) VALUES
('submission1-uuid', 'template1-uuid', 'user1-uuid', '{"issue":"Cannot access email","priority":"high"}', 'open', 'high'),
('submission2-uuid', 'template1-uuid', 'user2-uuid', '{"issue":"Printer not working","priority":"medium"}', 'open', 'medium');

-- Assign tickets to helpdesk
INSERT INTO ticket_assignments (id, ticket_id, helpdesk_id, assigned_by) VALUES
('assignment1-uuid', 'submission1-uuid', 'helpdesk1-uuid', 'admin1-uuid'),
('assignment2-uuid', 'submission2-uuid', 'helpdesk2-uuid', 'admin1-uuid');

-- Add some chat messages
INSERT INTO chat_messages (id, ticket_id, sender_id, receiver_id, content) VALUES
('msg1-uuid', 'submission1-uuid', 'user1-uuid', 'helpdesk1-uuid', 'Hi, any update on my email issue?'),
('msg2-uuid', 'submission1-uuid', 'helpdesk1-uuid', 'user1-uuid', 'Yes, we are working on it. Will update you shortly.');

-- Add some audit logs
INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details) VALUES
('audit1-uuid', 'admin1-uuid', 'create', 'form_template', 'template1-uuid', '{"name":"IT Support Request"}'),
('audit2-uuid', 'admin1-uuid', 'assign', 'ticket', 'submission1-uuid', '{"assigned_to":"helpdesk1-uuid"}');

-- Add some quick replies
INSERT INTO quick_replies (id, user_id, content, category) VALUES
('qr1-uuid', 'helpdesk1-uuid', 'We are working on your request and will update you shortly.', 'status_update'),
('qr2-uuid', 'helpdesk1-uuid', 'Could you please provide more details about the issue?', 'request_info'); 