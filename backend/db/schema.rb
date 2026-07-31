# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_07_31_042121) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "locales", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_locales_on_name", unique: true
  end

  create_table "member_memberships", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.bigint "member_id", null: false
    t.bigint "membership_id", null: false
    t.datetime "updated_at", null: false
    t.index ["member_id"], name: "index_member_memberships_on_member_id", unique: true
    t.index ["membership_id"], name: "index_member_memberships_on_membership_id"
  end

  create_table "members", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "deleted_at"
    t.string "login_id", null: false
    t.string "password_digest", null: false
    t.integer "role", default: 0, null: false
    t.datetime "updated_at", null: false
    t.string "username", null: false
    t.index ["deleted_at"], name: "index_members_on_deleted_at"
    t.index ["login_id"], name: "index_members_on_login_id", unique: true
    t.index ["role"], name: "index_members_on_role"
  end

  create_table "membership_permissions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "membership_id", null: false
    t.bigint "permission_id", null: false
    t.datetime "updated_at", null: false
    t.index ["membership_id", "permission_id"], name: "index_membership_permissions_on_membership_and_permission", unique: true
    t.index ["membership_id"], name: "index_membership_permissions_on_membership_id"
    t.index ["permission_id"], name: "index_membership_permissions_on_permission_id"
  end

  create_table "memberships", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "duration_days", null: false
    t.string "name", null: false
    t.integer "price", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_memberships_on_name", unique: true
  end

  create_table "permissions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_permissions_on_name", unique: true
  end

  create_table "purchase_histories", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "member_id", null: false
    t.bigint "membership_id", null: false
    t.integer "price_at_purchase", null: false
    t.integer "source", default: 0, null: false
    t.integer "state", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["member_id"], name: "index_purchase_histories_on_member_id"
    t.index ["membership_id"], name: "index_purchase_histories_on_membership_id"
    t.index ["source"], name: "index_purchase_histories_on_source"
    t.index ["state"], name: "index_purchase_histories_on_state"
  end

  create_table "topic_paragraph_translations", force: :cascade do |t|
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.bigint "locale_id", null: false
    t.bigint "topic_paragraph_id", null: false
    t.datetime "updated_at", null: false
    t.index ["locale_id"], name: "index_topic_paragraph_translations_on_locale_id"
    t.index ["topic_paragraph_id", "locale_id"], name: "index_topic_paragraph_translations_on_paragraph_and_locale", unique: true
    t.index ["topic_paragraph_id"], name: "index_topic_paragraph_translations_on_topic_paragraph_id"
  end

  create_table "topic_paragraphs", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "position", null: false
    t.bigint "topic_id", null: false
    t.datetime "updated_at", null: false
    t.index ["topic_id", "position"], name: "index_topic_paragraphs_on_topic_id_and_position", unique: true
    t.index ["topic_id"], name: "index_topic_paragraphs_on_topic_id"
  end

  create_table "topics", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "deleted_at"
    t.string "title", null: false
    t.string "title_en", null: false
    t.datetime "updated_at", null: false
    t.index ["deleted_at"], name: "index_topics_on_deleted_at"
  end

  add_foreign_key "member_memberships", "members"
  add_foreign_key "member_memberships", "memberships"
  add_foreign_key "membership_permissions", "memberships"
  add_foreign_key "membership_permissions", "permissions"
  add_foreign_key "purchase_histories", "members"
  add_foreign_key "purchase_histories", "memberships"
  add_foreign_key "topic_paragraph_translations", "locales"
  add_foreign_key "topic_paragraph_translations", "topic_paragraphs"
  add_foreign_key "topic_paragraphs", "topics"
end
