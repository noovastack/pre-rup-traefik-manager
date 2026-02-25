package models

type Stream struct {
	ID          int    `json:"id" db:"id"`
	CreatedAt   string `json:"created_at" db:"created_at"`
	Type        string `json:"type" db:"type"` // "tcp" or "udp"
	Entrypoint  string `json:"entrypoint" db:"entrypoint"` // Name of the traefik entrypoint
	SNI         string `json:"sni" db:"sni"` // TCP HostSNI
	ForwardHost string `json:"forward_host" db:"forward_host"`
	ForwardPort int    `json:"forward_port" db:"forward_port"`
}
