package com.store.inventory.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.store.inventory.config.AppProperties;
import com.store.inventory.exception.TooManyRequestsException;
import com.store.inventory.order.OrderStatus;
import com.store.inventory.product.Product;
import com.store.inventory.product.StockStatus;
import com.store.inventory.security.LoginRateLimiter;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class DomainRulesTest {

    @Test
    void stockStatusDerivesFromQuantityAndThreshold() {
        Product p = new Product();
        p.setReorderThreshold(5);
        p.setQuantity(0);
        assertThat(p.stockStatus()).isEqualTo(StockStatus.OUT_OF_STOCK);
        p.setQuantity(5);
        assertThat(p.stockStatus()).isEqualTo(StockStatus.LOW_STOCK);
        p.setQuantity(6);
        assertThat(p.stockStatus()).isEqualTo(StockStatus.IN_STOCK);
    }

    @Test
    void orderStatusTransitionsAreForwardOnly() {
        assertThat(OrderStatus.PLACED.allowedNext()).containsExactlyInAnyOrder(OrderStatus.CONFIRMED, OrderStatus.CANCELLED);
        assertThat(OrderStatus.SHIPPED.allowedNext()).containsExactly(OrderStatus.DELIVERED);
        assertThat(OrderStatus.DELIVERED.allowedNext()).isEmpty();
        assertThat(OrderStatus.CANCELLED.allowedNext()).isEmpty();
    }

    @Test
    void rateLimiterBlocksAfterMaxFailuresAndResetsOnSuccess() {
        AppProperties props = new AppProperties(null, null, null, new AppProperties.Login(3, Duration.ofMinutes(10)), null);
        LoginRateLimiter limiter = new LoginRateLimiter(props);
        for (int i = 0; i < 3; i++) {
            limiter.check("1.1.1.1", "a@b.c");
            limiter.recordFailure("1.1.1.1", "a@b.c");
        }
        assertThatThrownBy(() -> limiter.check("1.1.1.1", "A@b.c")).isInstanceOf(TooManyRequestsException.class);
        limiter.check("1.1.1.1", "other@b.c"); // different account is unaffected
        limiter.reset("1.1.1.1", "a@b.c");
        limiter.check("1.1.1.1", "a@b.c");
    }
}
