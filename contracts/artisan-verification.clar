;; Artisan Verification Contract
;; This contract validates legitimate furniture makers

(define-data-var admin principal tx-sender)

;; Map of verified artisans
(define-map artisans
  { artisan-id: (string-utf8 36) }
  {
    principal: principal,
    name: (string-utf8 100),
    credentials: (string-utf8 200),
    verified: bool,
    verification-date: uint
  }
)

;; Public function to register as an artisan (pending verification)
(define-public (register-artisan (artisan-id (string-utf8 36)) (name (string-utf8 100)) (credentials (string-utf8 200)))
  (let ((caller tx-sender))
    (if (map-insert artisans
          { artisan-id: artisan-id }
          {
            principal: caller,
            name: name,
            credentials: credentials,
            verified: false,
            verification-date: u0
          })
        (ok true)
        (err u1) ;; Artisan ID already exists
    )
  )
)

;; Admin function to verify an artisan
(define-public (verify-artisan (artisan-id (string-utf8 36)))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
      (match (map-get? artisans { artisan-id: artisan-id })
        artisan-data (begin
          (map-set artisans
            { artisan-id: artisan-id }
            (merge artisan-data {
              verified: true,
              verification-date: block-height
            })
          )
          (ok true)
        )
        (err u2) ;; Artisan not found
      )
      (err u3) ;; Not authorized
    )
  )
)

;; Public function to check if an artisan is verified
(define-read-only (is-verified-artisan (artisan-id (string-utf8 36)))
  (match (map-get? artisans { artisan-id: artisan-id })
    artisan-data (ok (get verified artisan-data))
    (err u2) ;; Artisan not found
  )
)

;; Admin function to transfer admin rights
(define-public (set-admin (new-admin principal))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
      (begin
        (var-set admin new-admin)
        (ok true)
      )
      (err u3) ;; Not authorized
    )
  )
)
