package com.store.inventory.product;

import com.store.inventory.common.PageResponse;
import com.store.inventory.product.ProductDtos.CatalogProductDto;
import com.store.inventory.product.ProductDtos.ProductDto;
import com.store.inventory.product.ProductDtos.ProductRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    // ---- manager APIs (include cost price) ----

    @GetMapping("/api/products")
    @PreAuthorize("hasRole('STORE_MANAGER')")
    public PageResponse<ProductDto> list(@RequestParam(required = false) String q,
                                         @RequestParam(required = false) Long categoryId,
                                         @RequestParam(required = false) StockStatus stockStatus,
                                         @RequestParam(required = false) Boolean active,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "10") int size,
                                         @RequestParam(required = false) String sortBy,
                                         @RequestParam(required = false) String direction) {
        return service.search(q, categoryId, stockStatus, active, page, size, sortBy, direction);
    }

    @GetMapping("/api/products/{id}")
    @PreAuthorize("hasRole('STORE_MANAGER')")
    public ProductDto get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping("/api/products")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('STORE_MANAGER')")
    public ProductDto create(@Valid @RequestBody ProductRequest req, @AuthenticationPrincipal Jwt jwt) {
        return service.create(req, Long.valueOf(jwt.getSubject()));
    }

    @PutMapping("/api/products/{id}")
    @PreAuthorize("hasRole('STORE_MANAGER')")
    public ProductDto update(@PathVariable Long id, @Valid @RequestBody ProductRequest req,
                             @AuthenticationPrincipal Jwt jwt) {
        return service.update(id, req, Long.valueOf(jwt.getSubject()));
    }

    @DeleteMapping("/api/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('STORE_MANAGER')")
    public void deactivate(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        service.deactivate(id, Long.valueOf(jwt.getSubject()));
    }

    // ---- catalogue (any authenticated user; active products only, no internal fields) ----

    @GetMapping("/api/catalog")
    public PageResponse<CatalogProductDto> catalog(@RequestParam(required = false) String q,
                                                   @RequestParam(required = false) Long categoryId,
                                                   @RequestParam(required = false) StockStatus stockStatus,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "12") int size,
                                                   @RequestParam(required = false) String sortBy,
                                                   @RequestParam(required = false) String direction) {
        return service.catalog(q, categoryId, stockStatus, page, size, sortBy == null ? "name" : sortBy,
                direction == null ? "asc" : direction);
    }

    @GetMapping("/api/catalog/{id}")
    public CatalogProductDto catalogItem(@PathVariable Long id) {
        return service.catalogItem(id);
    }
}
