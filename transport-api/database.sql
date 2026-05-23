-- USERS
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(255) NULL,
    role VARCHAR(255) DEFAULT 'employee',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255),
    remember_token VARCHAR(100),
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

-- PASSWORD RESET TOKENS
CREATE TABLE password_reset_tokens (
    email VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255),
    created_at TIMESTAMP NULL
);

-- SESSIONS
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    payload LONGTEXT,
    last_activity INT,
    INDEX (user_id),
    INDEX (last_activity)
);

-- VEHICLES
CREATE TABLE vehicles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    plate_number VARCHAR(255) UNIQUE,
    type ENUM('bus','van','car','minibus'),
    capacity INT UNSIGNED,
    model VARCHAR(255),
    year VARCHAR(255),
    color VARCHAR(255),
    status ENUM('active','inactive','maintenance') DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    INDEX (status),
    INDEX (plate_number)
);

-- DRIVERS
CREATE TABLE drivers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED,
    vehicle_id BIGINT UNSIGNED NULL,
    license_number VARCHAR(255) UNIQUE,
    license_expiry DATE,
    license_type ENUM('A','B','C','D','EB') DEFAULT 'B',
    is_available BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    INDEX (is_available),
    INDEX (license_expiry),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- ROUTES
CREATE TABLE routes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    code VARCHAR(255) UNIQUE,
    description TEXT,
    start_location VARCHAR(255),
    end_location VARCHAR(255),
    start_latitude DECIMAL(10,7),
    start_longitude DECIMAL(10,7),
    end_latitude DECIMAL(10,7),
    end_longitude DECIMAL(10,7),
    estimated_duration_minutes INT UNSIGNED,
    total_distance_km DECIMAL(8,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL
);

-- ROUTE STOPS
CREATE TABLE route_stops (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    route_id BIGINT UNSIGNED,
    name VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    order_number INT UNSIGNED,
    estimated_minutes_from_start INT UNSIGNED DEFAULT 0,
    landmark VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    UNIQUE (route_id, order_number),
    INDEX (route_id, order_number),
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);

-- EMPLOYEES
CREATE TABLE employees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED,
    route_id BIGINT UNSIGNED NULL,
    employee_code VARCHAR(255) UNIQUE,
    department VARCHAR(255),
    position VARCHAR(255),
    pickup_stop VARCHAR(255),
    pickup_latitude DECIMAL(10,7),
    pickup_longitude DECIMAL(10,7),
    notes TEXT,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    INDEX (employee_code),
    INDEX (route_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
);

-- TRIPS
CREATE TABLE trips (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    route_id BIGINT UNSIGNED,
    vehicle_id BIGINT UNSIGNED,
    driver_id BIGINT UNSIGNED,
    status ENUM('scheduled','active','completed','cancelled') DEFAULT 'scheduled',
    scheduled_start DATETIME NULL,
    started_at DATETIME NULL,
    ended_at DATETIME NULL,
    is_simulated BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    INDEX (status),
    INDEX (started_at),
    INDEX (status, started_at),
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT
);

-- TRIP EMPLOYEES (PIVOT)
CREATE TABLE trip_employees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trip_id BIGINT UNSIGNED,
    employee_id BIGINT UNSIGNED,
    boarded_at TIMESTAMP NULL,
    alighted_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    UNIQUE (trip_id, employee_id),
    INDEX (trip_id),
    INDEX (employee_id),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- VEHICLE LOCATIONS
CREATE TABLE vehicle_locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trip_id BIGINT UNSIGNED,
    vehicle_id BIGINT UNSIGNED,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    speed DECIMAL(5,2),
    heading DECIMAL(5,2),
    accuracy DECIMAL(8,2),
    altitude DECIMAL(8,2),
    recorded_at TIMESTAMP,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX (trip_id, recorded_at),
    INDEX (vehicle_id, recorded_at),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- PERSONAL ACCESS TOKENS (SANCTUM)
CREATE TABLE personal_access_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tokenable_id BIGINT UNSIGNED,
    tokenable_type VARCHAR(255),
    name TEXT,
    token VARCHAR(64) UNIQUE,
    abilities TEXT,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX (expires_at)
);

-- JOBS
CREATE TABLE jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    queue VARCHAR(255),
    payload LONGTEXT,
    attempts TINYINT UNSIGNED,
    reserved_at INT,
    available_at INT,
    created_at INT,
    INDEX (queue, reserved_at, available_at)
);

-- JOB BATCHES
CREATE TABLE job_batches (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    total_jobs INT,
    pending_jobs INT,
    failed_jobs INT,
    failed_job_ids LONGTEXT,
    options MEDIUMTEXT,
    cancelled_at INT,
    created_at INT,
    finished_at INT
);

-- FAILED JOBS
CREATE TABLE failed_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(255) UNIQUE,
    connection TEXT,
    queue TEXT,
    payload LONGTEXT,
    exception LONGTEXT,
    failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CACHE
CREATE TABLE cache (
    `key` VARCHAR(255) PRIMARY KEY,
    value MEDIUMTEXT,
    expiration INT,
    INDEX (expiration)
);

-- CACHE LOCKS
CREATE TABLE cache_locks (
    `key` VARCHAR(255) PRIMARY KEY,
    owner VARCHAR(255),
    expiration INT,
    INDEX (expiration)
);