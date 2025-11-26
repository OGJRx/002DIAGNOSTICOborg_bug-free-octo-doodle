-- Table to store immutable events (Event Store)
CREATE TABLE public.job_events (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- Ex: 'JOB_SCHEDULED', 'STATUS_CHANGED'
    event_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_events_job_id ON public.job_events(job_id);
