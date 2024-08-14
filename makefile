# Directorios
NODE_DIR=AppLora/Node
FRONTEND_DIR=AppLora/Frontend/loraweb



# Reglas
all: install_node install_frontend start_node start_frontend 

install_node:
	cd $(NODE_DIR) && npm install

install_frontend:
	cd $(FRONTEND_DIR) && npm install

start_node:
	start cmd /c "cd $(NODE_DIR) && node server.js"

start_frontend:
	start cmd /c "cd $(FRONTEND_DIR) && npm run dev"

