-- Thêm các chỉ mục (indexes) để tối ưu hóa hiệu suất truy vấn

-- Chỉ mục cho bảng templates
CREATE INDEX IF NOT EXISTS idx_templates_id ON templates(id);

-- Chỉ mục cho bảng template_layouts
CREATE INDEX IF NOT EXISTS idx_template_layouts_template_id ON template_layouts(template_id);
CREATE INDEX IF NOT EXISTS idx_template_layouts_slot_id ON template_layouts(slot_id);

-- Chỉ mục cho bảng template_categories
CREATE INDEX IF NOT EXISTS idx_template_categories_template_id ON template_categories(template_id);
CREATE INDEX IF NOT EXISTS idx_template_categories_category_id ON template_categories(category_id);

-- Chỉ mục cho bảng categories
CREATE INDEX IF NOT EXISTS idx_categories_id ON categories(id);
