package com.store.inventory.order;

import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from StoreOrder o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    @Override
    @EntityGraph(attributePaths = "customer")
    Page<Order> findAll(Specification<Order> spec, Pageable pageable);

    @EntityGraph(attributePaths = "customer")
    List<Order> findTop5ByOrderByCreatedAtDesc();

    interface StatusTotals {
        OrderStatus getStatus();

        long getOrders();

        BigDecimal getTotal();
    }

    @Query("""
            select o.status as status, count(o) as orders, coalesce(sum(o.totalAmount), 0) as total
            from StoreOrder o where o.createdAt >= :from and o.createdAt < :to group by o.status""")
    List<StatusTotals> totalsByStatus(@Param("from") Instant from, @Param("to") Instant to);
}
