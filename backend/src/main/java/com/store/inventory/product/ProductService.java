package com.store.inventory.product;

import com.store.inventory.category.CategoryService;
import com.store.inventory.common.PageRequests;
import com.store.inventory.common.PageResponse;
import com.store.inventory.exception.ApiException;
import com.store.inventory.inventory.InventoryService;
import com.store.inventory.inventory.MovementType;
import com.store.inventory.product.ProductDtos.CatalogProductDto;
import com.store.inventory.product.ProductDtos.ProductDto;
import com.store.inventory.product.ProductDtos.ProductRequest;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);
    public static final Set<String> SORTABLE = Set.of("name", "sku", "price", "quantity", "createdAt", "updatedAt");

    private final ProductRepository products;
    private final CategoryService categories;
    private final InventoryService inventory;

    public ProductService(ProductRepository products, CategoryService categories, InventoryService inventory) {
        this.products = products;
        this.categories = categories;
        this.inventory = inventory;
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductDto> search(String q, Long categoryId, StockStatus status, Boolean active,
                                           int page, int size, String sortBy, String dir) {
        Pageable pageable = PageRequests.of(page, size, sortBy, dir, SORTABLE, "name");
        Page<Product> result = products.findAll(ProductSpecs.filter(q, categoryId, status, active), pageable);
        return PageResponse.of(result, ProductDto::from);
    }

    @Transactional(readOnly = true)
    public ProductDto get(Long id) {
        return ProductDto.from(find(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<CatalogProductDto> catalog(String q, Long categoryId, StockStatus status,
                                                   int page, int size, String sortBy, String dir) {
        Pageable pageable = PageRequests.of(page, size, sortBy, dir, SORTABLE, "name");
        Page<Product> result = products.findAll(ProductSpecs.filter(q, categoryId, status, true), pageable);
        return PageResponse.of(result, CatalogProductDto::from);
    }

    @Transactional(readOnly = true)
    public CatalogProductDto catalogItem(Long id) {
        Product p = find(id);
        if (!p.isActive()) {
            throw ApiException.notFound("Product not found");
        }
        return CatalogProductDto.from(p);
    }

    @Transactional
    public ProductDto create(ProductRequest req, Long actorId) {
        String sku = req.sku().trim();
        String barcode = normalizeBarcode(req.barcode());
        if (products.existsBySkuIgnoreCase(sku)) {
            throw ApiException.conflict("SKU '" + sku + "' is already in use");
        }
        if (barcode != null && products.existsByBarcode(barcode)) {
            throw ApiException.conflict("Barcode '" + barcode + "' is already in use");
        }
        Product p = new Product();
        apply(p, req, sku, barcode);
        p.setActive(req.active() == null || req.active());
        p.setQuantity(0);
        p = products.saveAndFlush(p);
        int initial = req.initialQuantity() == null ? 0 : req.initialQuantity();
        if (initial > 0) {
            inventory.applyChange(p.getId(), MovementType.INITIAL, initial, "Initial stock", null, actorId);
        }
        log.info("Product created id={} sku={} by user={}", p.getId(), p.getSku(), actorId);
        return ProductDto.from(p);
    }

    @Transactional
    public ProductDto update(Long id, ProductRequest req, Long actorId) {
        Product p = products.findByIdForUpdate(id).orElseThrow(() -> ApiException.notFound("Product not found"));
        String sku = req.sku().trim();
        String barcode = normalizeBarcode(req.barcode());
        if (products.existsBySkuIgnoreCaseAndIdNot(sku, id)) {
            throw ApiException.conflict("SKU '" + sku + "' is already in use");
        }
        if (barcode != null && products.existsByBarcodeAndIdNot(barcode, id)) {
            throw ApiException.conflict("Barcode '" + barcode + "' is already in use");
        }
        apply(p, req, sku, barcode);
        if (req.active() != null) {
            p.setActive(req.active());
        }
        log.info("Product updated id={} by user={}", id, actorId);
        return ProductDto.from(p);
    }

    /** Products are referenced by order history and audit records, so "delete" deactivates them. */
    @Transactional
    public void deactivate(Long id, Long actorId) {
        Product p = products.findByIdForUpdate(id).orElseThrow(() -> ApiException.notFound("Product not found"));
        p.setActive(false);
        log.info("Product deactivated id={} by user={}", id, actorId);
    }

    public Product find(Long id) {
        return products.findById(id).orElseThrow(() -> ApiException.notFound("Product not found"));
    }

    private void apply(Product p, ProductRequest req, String sku, String barcode) {
        p.setName(req.name().trim());
        p.setSku(sku);
        p.setBarcode(barcode);
        p.setDescription(req.description());
        p.setCategory(req.categoryId() == null ? null : categories.find(req.categoryId()));
        p.setPrice(req.price());
        p.setCostPrice(req.costPrice());
        p.setReorderThreshold(req.reorderThreshold());
    }

    private static String normalizeBarcode(String b) {
        return b == null || b.isBlank() ? null : b.trim();
    }
}
