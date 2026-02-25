package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
)

// Encrypt string to base64 encrypted string using AES-GCM
func Encrypt(plaintext string) (string, error) {
	key := os.Getenv("TM_ENCRYPTION_KEY")
	if len(key) != 32 {
		return "", errors.New("TM_ENCRYPTION_KEY must be exactly 32 bytes")
	}

	block, err := aes.NewCipher([]byte(key))
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt base64 encrypted string back to plaintext using AES-GCM
func Decrypt(cryptoText string) (string, error) {
	key := os.Getenv("TM_ENCRYPTION_KEY")
	if len(key) != 32 {
		return "", errors.New("TM_ENCRYPTION_KEY must be exactly 32 bytes")
	}

	ciphertext, err := base64.StdEncoding.DecodeString(cryptoText)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher([]byte(key))
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, []byte(nonce), ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decryption failed. Wrong TM_ENCRYPTION_KEY? %v", err)
	}

	return string(plaintext), nil
}
