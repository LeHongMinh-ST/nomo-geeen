# Design — Core operational reports

Add a read-only ReportsModule with one service and controller. Stock summary reads Stock with
Product and ProductBatch data; sales summary reads completed Sale aggregates and SaleLine product
snapshots. No writes or new persistence. All filters are tenant-scoped and date ranges are bounded
by DTO validation.
