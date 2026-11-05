CREATE TYPE "public"."billShareStatus" AS ENUM('pending', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."billStatus" AS ENUM('open', 'locked', 'paid');--> statement-breakpoint
CREATE TYPE "public"."serviceRequestStatus" AS ENUM('pending', 'handled');--> statement-breakpoint
CREATE TYPE "public"."serviceRequestType" AS ENUM('call_waiter', 'water', 'cutlery', 'bill', 'move_table');--> statement-breakpoint
CREATE TYPE "public"."tableSessionStatus" AS ENUM('open', 'billing', 'closed');--> statement-breakpoint
CREATE TABLE "bill_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "billShareStatus" DEFAULT 'pending' NOT NULL,
	"items" jsonb,
	"payment_method" text,
	"paid_at" timestamp,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"status" "billStatus" DEFAULT 'open' NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"service_amount" integer DEFAULT 0 NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"payment_method" text,
	"split_mode" text,
	"locked_at" timestamp,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bills_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "feedback_menu_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid,
	"table_id" uuid,
	"customer_name" text,
	"overall_rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"table_id" uuid NOT NULL,
	"type" "serviceRequestType" NOT NULL,
	"status" "serviceRequestStatus" DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"handled_at" timestamp,
	"handled_by" uuid
);
--> statement-breakpoint
CREATE TABLE "table_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"table_id" uuid NOT NULL,
	"status" "tableSessionStatus" DEFAULT 'open' NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"closed_reason" text,
	"merged_into_session_id" uuid
);
--> statement-breakpoint
ALTER TABLE "payment_requests" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "is_popular" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "badge" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "submitted_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD COLUMN "bill_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD COLUMN "share_id" uuid;--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "qr_token" text DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "is_open" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_type" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "plan" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "bill_shares" ADD CONSTRAINT "bill_shares_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_shares" ADD CONSTRAINT "bill_shares_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_menu_ratings" ADD CONSTRAINT "feedback_menu_ratings_feedback_id_feedbacks_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedbacks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_menu_ratings" ADD CONSTRAINT "feedback_menu_ratings_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "table_sessions_one_active_per_table_idx" ON "table_sessions" USING btree ("table_id") WHERE "table_sessions"."status" in ('open', 'billing');--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_share_id_bill_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."bill_shares"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_session_idempotency_key_idx" ON "orders" USING btree ("session_id","idempotency_key");--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_qr_token_unique" UNIQUE("qr_token");