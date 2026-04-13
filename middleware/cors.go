package middleware

import (
	"net/http"
	"strings"
)

// CORS middleware handles cross-origin requests
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		
		// Allow multiple origins
		allowedOrigins := []string{
			"http://localhost:3000",
			"https://tagmind.pro",
			"https://www.tagmind.pro",
			"https://api.tagmind.pro",
		}
		
		// Check if origin is allowed
		for _, allowed := range allowedOrigins {
			if strings.HasPrefix(origin, allowed) || origin == "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}
		
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "86400")
		
		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}
