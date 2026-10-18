package com.store.inventory.common;

import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Builds bounded, whitelisted-sort page requests from raw query parameters. */
public final class PageRequests {

    public static final int MAX_PAGE_SIZE = 100;

    private PageRequests() {}

    public static Pageable of(int page, int size, String sortBy, String direction,
                              Set<String> allowedSorts, String defaultSort) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        String property = sortBy != null && allowedSorts.contains(sortBy) ? sortBy : defaultSort;
        Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(safePage, safeSize, Sort.by(dir, property).and(Sort.by(Sort.Direction.DESC, "id")));
    }
}
