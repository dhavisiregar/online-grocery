package utils

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

type Pagination struct {
	Page  int    `json:"page"`
	Limit int    `json:"limit"`
	Total int64  `json:"total"`
	Sort  string `json:"-"`
	Order string `json:"-"`
}

// ParsePagination reads page/limit/sort/order query params with sane
// defaults. All list endpoints must paginate/filter/sort server-side.
func ParsePagination(c *gin.Context) Pagination {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}
	order := c.DefaultQuery("order", "desc")
	if order != "asc" && order != "desc" {
		order = "desc"
	}
	return Pagination{
		Page:  page,
		Limit: limit,
		Sort:  c.DefaultQuery("sort", "created_at"),
		Order: order,
	}
}

func (p Pagination) Offset() int {
	return (p.Page - 1) * p.Limit
}
