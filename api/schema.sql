CREATE TYPE job_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'READY', 'DELIVERED');

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    vehicle_info TEXT NOT NULL,
    problem_description TEXT,
    scheduled_date DATE,
    status job_status DEFAULT 'SCHEDULED',
    notes TEXT,
    progress INT DEFAULT 0,
    is_lead BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bot_sessions (
    user_id BIGINT PRIMARY KEY,
    current_step VARCHAR(50), -- 'AWAIT_NAME', 'AWAIT_VEHICLE', etc.
    temp_data JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE job_events (
    id SERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    event_type TEXT,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
