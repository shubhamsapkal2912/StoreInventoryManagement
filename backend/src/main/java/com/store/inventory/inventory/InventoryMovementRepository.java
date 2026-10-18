package com.store.inventory.inventory;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

public interface InventoryMovementRepository
        extends JpaRepository<InventoryMovement, Long>, JpaSpecificationExecutor<InventoryMovement> {

    @Override
    @EntityGraph(attributePaths = {"product", "createdBy"})
    Page<InventoryMovement> findAll(Specification<InventoryMovement> spec, Pageable pageable);
}
