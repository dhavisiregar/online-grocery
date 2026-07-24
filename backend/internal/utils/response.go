package utils

import "github.com/gin-gonic/gin"

func Success(c *gin.Context, status int, message string, data interface{}) {
	c.JSON(status, gin.H{
		"success": true,
		"message": message,
		"data":    data,
	})
}

func Error(c *gin.Context, status int, message string) {
	c.AbortWithStatusJSON(status, gin.H{
		"success": false,
		"message": message,
	})
}

func NotImplemented(c *gin.Context, feature string) {
	Error(c, 501, feature+" is not implemented yet")
}
