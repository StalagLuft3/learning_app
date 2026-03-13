ALTER TABLE "courses"
ALTER COLUMN "duration" TYPE DOUBLE PRECISION
USING "duration"::double precision;