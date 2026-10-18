package com.store.inventory.category;

import com.store.inventory.exception.ApiException;
import com.store.inventory.product.ProductRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {

    public record CategoryRequest(@NotBlank @Size(max = 100) String name, @Size(max = 500) String description) {}

    public record CategoryDto(Long id, String name, String description, long productCount) {}

    private final CategoryRepository categories;
    private final ProductRepository products;

    public CategoryService(CategoryRepository categories, ProductRepository products) {
        this.categories = categories;
        this.products = products;
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> list() {
        return categories.findAll(Sort.by("name")).stream()
                .map(c -> toDto(c, products.countByCategoryId(c.getId()))).toList();
    }

    @Transactional
    public CategoryDto create(CategoryRequest req) {
        String name = req.name().trim();
        if (categories.existsByNameIgnoreCase(name)) {
            throw ApiException.conflict("A category named '" + name + "' already exists");
        }
        Category c = new Category();
        c.setName(name);
        c.setDescription(req.description());
        return toDto(categories.save(c), 0);
    }

    @Transactional
    public CategoryDto update(Long id, CategoryRequest req) {
        Category c = find(id);
        String name = req.name().trim();
        if (categories.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw ApiException.conflict("A category named '" + name + "' already exists");
        }
        c.setName(name);
        c.setDescription(req.description());
        return toDto(c, products.countByCategoryId(id));
    }

    @Transactional
    public void delete(Long id) {
        Category c = find(id);
        long used = products.countByCategoryId(id);
        if (used > 0) {
            throw ApiException.conflict("Category is assigned to " + used
                    + " product(s). Reassign them before deleting the category.");
        }
        categories.delete(c);
    }

    public Category find(Long id) {
        return categories.findById(id).orElseThrow(() -> ApiException.notFound("Category not found"));
    }

    private CategoryDto toDto(Category c, long count) {
        return new CategoryDto(c.getId(), c.getName(), c.getDescription(), count);
    }
}
