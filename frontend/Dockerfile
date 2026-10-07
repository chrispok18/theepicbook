# Minimal Nginx runtime image: no Node.js, no build tools
FROM nginx:alpine
# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*
# Copy only the static frontend files into the Nginx web root
COPY public/ /usr/share/nginx/html/
# Internal frontend port only (never published to the host)
EXPOSE 80
