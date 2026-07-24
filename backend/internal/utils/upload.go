package utils

import (
	"errors"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

var ErrUploadTooLarge = errors.New("file size exceeds the allowed limit")
var ErrUploadBadExt = errors.New("file extension is not allowed")

// SaveUploadedFile validates a multipart file's extension and size, then
// writes it under uploadDir with a random name. Returns the public
// "/uploads/<name>" path to store on the record.
func SaveUploadedFile(c *gin.Context, field, uploadDir string, allowedExt []string, maxSizeMB int64) (string, error) {
	file, header, err := c.Request.FormFile(field)
	if err != nil {
		return "", err
	}
	defer file.Close()

	if header.Size > maxSizeMB*1024*1024 {
		return "", ErrUploadTooLarge
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !containsExt(allowedExt, ext) {
		return "", ErrUploadBadExt
	}

	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return "", err
	}

	name, err := RandomToken()
	if err != nil {
		return "", err
	}
	filename := name + ext
	if err := writeFile(filepath.Join(uploadDir, filename), file); err != nil {
		return "", err
	}

	return "/uploads/" + filename, nil
}

// SaveUploadedFileHeader validates and saves a single already-opened
// *multipart.FileHeader — used when multiple files share one form field
// (c.MultipartForm().File[field]) and FormFile can't be used per-file.
func SaveUploadedFileHeader(header *multipart.FileHeader, uploadDir string, allowedExt []string, maxSizeMB int64) (string, error) {
	if header.Size > maxSizeMB*1024*1024 {
		return "", ErrUploadTooLarge
	}
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !containsExt(allowedExt, ext) {
		return "", ErrUploadBadExt
	}

	src, err := header.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return "", err
	}
	name, err := RandomToken()
	if err != nil {
		return "", err
	}
	filename := name + ext
	if err := writeFile(filepath.Join(uploadDir, filename), src); err != nil {
		return "", err
	}
	return "/uploads/" + filename, nil
}

func containsExt(allowed []string, ext string) bool {
	for _, a := range allowed {
		if a == ext {
			return true
		}
	}
	return false
}

func writeFile(path string, src multipart.File) error {
	dst, err := os.Create(path)
	if err != nil {
		return err
	}
	defer dst.Close()
	_, err = io.Copy(dst, src)
	return err
}
