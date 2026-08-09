PULL         = missing
PODMAN_IMAGE = quay.io/hummingbird-ci/gitlab-ci:latest
PODMAN_RUN   = podman run --pull=$(PULL) --rm \
                 $(shell [ -t 0 ] && echo "-it" || echo "-i") \
                 -u 0 -v $(CURDIR):$(CURDIR):z -w $(CURDIR)

.PHONY: markdownlint-host markdownlint check-host check

markdownlint-host:
	markdownlint --disable=line-length $$(git ls-files '*.md')

markdownlint:
	$(PODMAN_RUN) $(PODMAN_IMAGE) make markdownlint-host

check-host: markdownlint-host

check:
	$(PODMAN_RUN) $(PODMAN_IMAGE) make check-host
