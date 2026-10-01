CREATE DATABASE IF NOT EXISTS autolink;
USE autolink;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    -- Using SET allows a user to have multiple roles simultaneously (e.g., CLIENT and OWNER)
    role SET('CLIENT', 'OWNER', 'DRIVER', 'STAFF_MANAGER', 'ADMIN') NOT NULL,
    status ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT DEFAULT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INT,
    registration_number VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    color VARCHAR(50),
    fuel_type VARCHAR(50),
    transmission VARCHAR(50),
    seats INT,
    description TEXT,
    rental_price_per_day DECIMAL(10, 2),
    status ENUM('AVAILABLE', 'RESERVED', 'RENTED', 'PENDING_VERIFICATION', 'IN_MAINTENANCE', 'UNAVAILABLE') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_vehicles_owner_id (owner_id),
    INDEX idx_vehicles_status (status)
) ENGINE=InnoDB;

-- Rental Requests Table
CREATE TABLE IF NOT EXISTS rental_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    fulfillment_method ENUM('PICKUP', 'DELIVERY') NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    INDEX idx_rental_requests_client (client_id),
    INDEX idx_rental_requests_vehicle (vehicle_id),
    INDEX idx_rental_requests_status (status)
) ENGINE=InnoDB;

-- Rentals Table
CREATE TABLE IF NOT EXISTS rentals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rental_request_id INT NOT NULL UNIQUE,
    client_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    fulfillment_method ENUM('PICKUP', 'DELIVERY') NOT NULL,
    status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rental_request_id) REFERENCES rental_requests(id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    INDEX idx_rentals_client (client_id),
    INDEX idx_rentals_vehicle (vehicle_id),
    INDEX idx_rentals_status (status)
) ENGINE=InnoDB;
