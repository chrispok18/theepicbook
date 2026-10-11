# Minimal Nginx runtime image: no Node.js, no build tools
FROM nginx:alpine
# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*
# Hardening: let the non-root nginx user write the paths Nginx needs at runtime
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
 && touch /run/nginx.pid && chown nginx:nginx /run/nginx.pid
# Copy only the static frontend files, owned by the nginx user
COPY --chown=nginx:nginx public/ /usr/share/nginx/html/
# Hardening: run as the built-in non-root nginx user (UID 101) instead of root
USER nginx
# Internal frontend port only (never published to the host)
EXPOSE 80
