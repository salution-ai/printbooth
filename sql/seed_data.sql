-- Thêm categories
INSERT INTO categories (id, name) VALUES 
('basic', 'Basic'),
('creative', 'Creative'),
('single', 'Single Photo'),
('double', 'Double Photo'),
('multiple', 'Multiple Photos')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Thêm templates
INSERT INTO templates (id, name, description, slots, image, frame_image, aspect_ratio, price) VALUES 
('1', 'Single Photo', 'Simple frame for a single photo', 4, '/images/frame1.png', '/images/frame1.png', 1.0, 99000),
('2', 'Double Photo', 'Frame for two photos side by side', 3, '/images/frame2.png', '/images/frame2.png', 1.0, 99000),
('3', 'Triple Photo', 'Frame for three photos', 3, '/images/frame3.png', '/images/frame3.png', 1.0, 99000),
('4', 'Quad Photo', 'Frame for four photos in a grid', 3, '/images/frame4.png', '/images/frame4.png', 1.0, 99000),
('5', 'Collage', 'Artistic collage for multiple photos', 4, '/images/frame5.png', '/images/frame5.png', 1.0, 99000);

-- Thêm layout cho template 1
INSERT INTO template_layouts (id, template_id, slot_id, x, y, width, height, custom_position) VALUES 
(UUID(), '1', 'slot-1', 41, 2, 18, 21, false),
(UUID(), '1', 'slot-2', 41, 22.5, 18, 21, false),
(UUID(), '1', 'slot-3', 41, 42.5, 18, 21, false),
(UUID(), '1', 'slot-4', 41, 62, 18, 21, false);

-- Thêm layout cho template 2
INSERT INTO template_layouts (id, template_id, slot_id, x, y, width, height, custom_position) VALUES 
(UUID(), '2', 'slot-1', 42, 3, 16, 31, false),
(UUID(), '2', 'slot-2', 42, 36, 16, 31, false),
(UUID(), '2', 'slot-3', 42, 66, 16, 31, false);

-- Thêm layout cho template 3
INSERT INTO template_layouts (id, template_id, slot_id, x, y, width, height, custom_position) VALUES 
(UUID(), '3', 'slot-1', 41, 3, 17, 27, false),
(UUID(), '3', 'slot-2', 41, 31, 17, 32, false),
(UUID(), '3', 'slot-3', 41, 64, 17, 28, false);

-- Thêm layout cho template 4
INSERT INTO template_layouts (id, template_id, slot_id, x, y, width, height, custom_position) VALUES 
(UUID(), '4', 'slot-1', 42, 2, 16, 29, false),
(UUID(), '4', 'slot-2', 42, 30, 16, 29, false),
(UUID(), '4', 'slot-3', 42, 59, 16, 29, false);

-- Thêm layout cho template 5
INSERT INTO template_layouts (id, template_id, slot_id, x, y, width, height, custom_position) VALUES 
(UUID(), '5', 'slot-1', 42, 5, 16, 20, false),
(UUID(), '5', 'slot-2', 42, 25, 16, 20, false),
(UUID(), '5', 'slot-3', 42, 46, 16, 19, false),
(UUID(), '5', 'slot-4', 42, 63, 16, 21, false);

-- Thêm categories cho templates
INSERT INTO template_categories (template_id, category_id) VALUES 
('1', 'basic'), ('1', 'single'),
('2', 'basic'), ('2', 'double'),
('3', 'basic'), ('3', 'multiple'),
('4', 'basic'), ('4', 'multiple'),
('5', 'creative'), ('5', 'multiple');
