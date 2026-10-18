package com.store.inventory.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.store.inventory.exception.ApiException;
import com.store.inventory.inventory.InventoryMovement;
import com.store.inventory.inventory.InventoryMovementRepository;
import com.store.inventory.inventory.InventoryService;
import com.store.inventory.inventory.MovementType;
import com.store.inventory.product.Product;
import com.store.inventory.product.ProductRepository;
import com.store.inventory.user.UserRepository;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    ProductRepository products;
    @Mock
    InventoryMovementRepository movements;
    @Mock
    UserRepository users;

    InventoryService service;
    Product product;

    @BeforeEach
    void setUp() {
        service = new InventoryService(products, movements, users);
        product = new Product();
        product.setName("Widget");
        product.setPrice(BigDecimal.TEN);
        product.setCostPrice(BigDecimal.ONE);
        product.setQuantity(5);
    }

    @Test
    void recordsMovementWithResultingQuantity() {
        when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(product));

        service.applyChange(1L, MovementType.STOCK_IN, 7, "delivery", "PO-9", null);

        assertThat(product.getQuantity()).isEqualTo(12);
        ArgumentCaptor<InventoryMovement> captor = ArgumentCaptor.forClass(InventoryMovement.class);
        verify(movements).save(captor.capture());
        assertThat(captor.getValue().getQuantityChange()).isEqualTo(7);
        assertThat(captor.getValue().getQuantityAfter()).isEqualTo(12);
        assertThat(captor.getValue().getReference()).isEqualTo("PO-9");
    }

    @Test
    void rejectsChangeThatWouldMakeStockNegative() {
        when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> service.applyChange(1L, MovementType.STOCK_OUT, -6, null, null, null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Insufficient stock");

        assertThat(product.getQuantity()).isEqualTo(5);
        verify(movements, never()).save(any());
    }

    @Test
    void allowsDrainingStockToExactlyZero() {
        when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(product));
        service.applyChange(1L, MovementType.STOCK_OUT, -5, null, null, null);
        assertThat(product.getQuantity()).isZero();
    }

    @Test
    void unknownProductIsNotFound() {
        when(products.findByIdForUpdate(2L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.applyChange(2L, MovementType.STOCK_IN, 1, null, null, null))
                .isInstanceOf(ApiException.class).hasMessageContaining("not found");
    }
}
