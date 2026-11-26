-- ============================================================
-- Migration 005: Extended profile fields
-- Adds optional personal/academic info columns to profiles.
-- All nullable — users fill them in after account creation.
-- ============================================================

alter table public.profiles
  add column if not exists avatar_url      text,
  add column if not exists bio             text check (char_length(bio) <= 300),
  add column if not exists grade           text check (char_length(grade) <= 50),
  add column if not exists school_name     text check (char_length(school_name) <= 100),
  add column if not exists college_name    text check (char_length(college_name) <= 100),
  add column if not exists department      text check (char_length(department) <= 100),
  add column if not exists semester        text check (char_length(semester) <= 20),
  add column if not exists roll_number     text check (char_length(roll_number) <= 50),
  add column if not exists city            text check (char_length(city) <= 100),
  add column if not exists updated_at      timestamptz default now();
