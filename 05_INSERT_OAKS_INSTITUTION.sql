-- Insert the 'Oaks International School' institution

INSERT INTO institutions (name)
VALUES ('Oaks International School')
ON CONFLICT (name) DO NOTHING;
