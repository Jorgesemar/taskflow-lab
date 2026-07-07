terraform {
    required_providers {
        docker = {
            source = "kreuzwerker/docker"
            version = "~> 3.0"
        }
    }
}

provider "docker" {}

resource "docker_network" "taskflow_net" {
    name = "taskflow_net"
}

resource "docker_volume" "db_data" {
    name = "taskflow_db_data"
}

resource "docker_image" "postgres" {
    name = "postgres:16-alpine"
}

resource "docker_container" "db" {
    name = "taskflow-db"
    image = docker_image.postgres.image_id
    networks_advanced {
        name = docker_network.taskflow_net.name
    }
    env = [
        "POSTGRES_USER=taskflow",
        "POSTGRES_PASSWORD=taskflow",
        "POSTGRES_DB=taskflow",
    ]
    volumes {
        volume_name = docker_volume.db_data.name
        container_path = "/var/lib/postgresql/data"
    }
}
resource "docker_image" "api" {
    name = "taskflow-api:local"
    build {
        context = "${path.module}/../../app"
    }
}
resource "docker_container" "api" {
    name = "taskflow-api"
    image = docker_image.api.image_id
    networks_advanced {
        name = docker_network.taskflow_net.name
    }
    env = [
        "DB_HOST=taskflow-db",
        "DB_USER=taskflow",
        "DB_PASSWORD=taskflow",
        "DB_NAME=taskflow",
    ]
    ports {
        internal = 3000
        external = 3000
    }
    depends_on = [docker_container.db]
}
