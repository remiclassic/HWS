DELETE FROM "user_cars"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "user_id", "car_id" ORDER BY "date_added" DESC
      ) AS "_rn"
    FROM "user_cars"
  ) AS "_d"
  WHERE "_d"."_rn" > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_cars_user_id_car_id_uidx" ON "user_cars" USING btree ("user_id","car_id");
