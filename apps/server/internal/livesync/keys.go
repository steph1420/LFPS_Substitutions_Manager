package livesync

import "net/url"

// decodePart reverses the client's encodeURIComponent for a key part.
func decodePart(p string) string {
	if s, err := url.PathUnescape(p); err == nil {
		return s
	}
	return p
}
