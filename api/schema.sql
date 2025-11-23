-- Esquema de Base de Datos para el Taller Automotriz (PostgreSQL)

-- Estados posibles para un trabajo/vehículo:
-- 'LEAD': Capturado por /cotizar, requiere llamada humana.
-- 'AGENDADO': Cita confirmada por /agendar.
-- 'EN_REVISION': Vehículo en el taller, diagnóstico en curso.
-- 'EN_REPARACION': Trabajo principal en curso.
-- 'LISTO_PARA_ENTREGA': El cliente puede retirar el vehículo.
-- 'COMPLETADO': Trabajo cerrado.
CREATE TYPE job_status AS ENUM (
    'LEAD',
    'AGENDADO',
    'EN_REVISION',
    'EN_REPARACION',
    'LISTO_PARA_ENTREGA',
    'COMPLETADO'
);

-- Tabla principal de Trabajos (Jobs)
CREATE TABLE jobs (
    -- Datos de la solicitud/cliente
    job_id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,           -- ID del usuario de Telegram
    telegram_chat_id BIGINT NOT NULL,            -- ID del chat donde se inició la solicitud (para respuestas)
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,

    -- Datos del vehículo y problema
    vehicle_make_model VARCHAR(100) NOT NULL,    -- Marca y Modelo (ej: Toyota Corolla)
    problem_description TEXT NOT NULL,           -- Descripción inicial del problema o servicio

    -- Estado y gestión interna
    current_status job_status NOT NULL DEFAULT 'LEAD',
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    internal_notes TEXT,                        -- Notas internas del personal (gestión de la Mini App)

    -- Fechas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scheduled_date DATE                          -- Fecha de agendamiento (si aplica)
);

-- Índices útiles para búsquedas rápidas
CREATE INDEX idx_jobs_user_id ON jobs (telegram_user_id);
CREATE INDEX idx_jobs_status ON jobs (current_status);

-- Función para actualizar automáticamente el campo 'updated_at'
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar 'updated_at' en cada UPDATE
CREATE TRIGGER update_jobs_timestamp
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();