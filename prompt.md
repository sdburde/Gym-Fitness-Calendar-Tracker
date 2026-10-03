# Build a Multi-User Gym & Fitness Calendar Tracker

Create a beautiful, modern, mobile-first **Gym & Fitness Tracking Calendar App** designed for a family or small group.

The main purpose of the app is to help users **consistently track whether they completed their planned exercise/workout each day**, while also allowing them to record weight, waist/belly size, running/cardio data, and any other personal metrics they want.

The most important feature is:

> **Every day should clearly show whether the planned exercise was completed or missed.**

The application must be simple enough to use every day in a few seconds.

---

# 1. Core Concept

Each user has their own independent fitness profile and database.

Example users:

- Saurabh
- Shrutika (Wife)
- Family Member 1
- Family Member 2

Users must be able to switch between profiles easily.

Each user's:

- Exercises
- Workout plans
- Exercise history
- Weight
- Waist/belly measurements
- Cardio/running data
- Custom tracking options
- Calendar history
- Progress charts

must remain completely separate.

Do NOT mix data between users.

Use a structure similar to:

```text
Users/
 ├── user_001/
 │    ├── profile
 │    ├── exercises
 │    ├── workout_plan
 │    ├── workout_history
 │    ├── measurements
 │    ├── cardio
 │    └── custom_metrics
 │
 ├── user_002/
 │    ├── profile
 │    ├── exercises
 │    ├── workout_plan
 │    ├── workout_history
 │    ├── measurements
 │    ├── cardio
 │    └── custom_metrics
```

The database implementation can differ, but the logical separation must remain.

---

# 2. Main Navigation

Use a simple bottom navigation on mobile:

### 📅 Calendar
Main workout tracking screen.

### 📊 Progress
Weight, waist, cardio and other metric charts.

### 🏋️ Exercises
Manage exercises and workout categories.

### ⚙️ Profile / Settings
User profile, custom metrics, preferences and user switching.

Keep the navigation minimal.

---

# 3. User Switching

User switching is extremely important because this will be used by family members.

Place the currently active user prominently at the top.

Example:

```text
┌───────────────────────────────┐
│ 👤 Saurabh              ▼     │
└───────────────────────────────┘
```

Tapping it opens:

```text
Select Profile

● Saurabh
○ Shrutika
○ Mom
○ Dad
○ Add Family Member +

[Switch]
```

Switching users should immediately load that user's:

- Calendar
- Workout plan
- Exercise list
- Measurements
- Progress charts

Never require logout/login just to switch between family profiles.

Provide an option to add a new family member.

---

# 4. Calendar: THE MAIN FEATURE

The calendar should be the heart of the application.

Show a monthly calendar.

Example:

```text
           October 2026

 Mon   Tue   Wed   Thu   Fri   Sat   Sun

       1     2     3     4
       🟢    🔴    🟢    ⚪

 5     6     7     8     9    10    11
 🟢    🟢    🔴    🟢    🟢    ⚪    🟢
```

But do not rely only on the green/red indicator.

When the user opens a day, show a large detailed card.

---

# 5. Exercise Completion Status

The completion tick should be based **ONLY on exercise completion**.

This is extremely important.

For example:

```text
October 3

🏋️ Today's Workout

☑ Chest
☑ Triceps
☐ Cardio

Status: 🔴 INCOMPLETE
```

Even if the user entered their weight and waist size, the day should NOT become green unless the required exercise/workout was completed.

### Rules

🟢 Green = planned exercise completed

🔴 Red = planned exercise not completed after the day ends

🟡 Yellow/Orange = partially completed, if partial completion is enabled

⚪ Grey = rest day / no workout planned

For example:

```text
Exercise:
☑ Chest
☑ Triceps
☐ Cardio

Result:
🔴 Workout incomplete
```

But:

```text
☑ Chest
☑ Triceps

Result:
🟢 Workout completed
```

Measurements such as weight or waist should never affect the exercise completion status.

---

# 6. Future Days

Future days should NOT be shown as missed.

Example:

```text
Today       → 🟢 / 🔴 / 🟡
Yesterday   → 🟢 / 🔴
Tomorrow    → ⚪ Planned
Future      → ⚪
```

Only mark a missed workout red **after the scheduled day has ended**.

---

# 7. Day Detail Screen

Clicking any calendar date should open a large day-detail screen.

Example:

```text
┌─────────────────────────────────────┐
│         Friday, October 3            │
│                                     │
│       🟢 WORKOUT COMPLETED          │
├─────────────────────────────────────┤
│                                     │
│ 🏋️ EXERCISES                        │
│                                     │
│ ☑ Chest                             │
│    Bench Press                      │
│    Weight: 60 kg                    │
│    Sets: 4                          │
│                                     │
│ ☑ Triceps                           │
│    Weight: 20 kg                    │
│    Sets: 3                          │
│                                     │
│ ☐ Cardio                            │
│                                     │
├─────────────────────────────────────┤
│ 📏 BODY MEASUREMENTS                │
│                                     │
│ Weight       70.4 kg                │
│ Waist        84 cm                  │
│                                     │
├─────────────────────────────────────┤
│ 🏃 CARDIO                           │
│                                     │
│ Running      5.2 km                 │
│ Duration    32 min                  │
│                                     │
├─────────────────────────────────────┤
│ 📝 NOTES                            │
│                                     │
│ Felt good today                     │
│                                     │
│             [ Save ]                │
└─────────────────────────────────────┘
```

The UI should be spacious and easy to use with one hand.

---

# 8. Exercise Selection

Users must be able to customize their exercises.

Provide:

### Default exercise categories

🏋️ Strength

- Chest
- Back
- Shoulders
- Biceps
- Triceps
- Legs
- Glutes
- Abs/Core

🏃 Cardio

- Running
- Walking
- Cycling
- Swimming
- HIIT
- Stair Climbing

🧘 Other

- Stretching
- Yoga
- Mobility
- Custom

But these should NOT be hard-coded as the only options.

Users must be able to add their own.

Example:

```text
Exercises

Chest
☑ Bench Press
☑ Incline Dumbbell Press
☑ Cable Fly

Back
☑ Lat Pulldown
☑ Seated Row

+ Add Exercise
```

---

# 9. Exercise Creation

When adding an exercise:

```text
Add Exercise

Exercise Name
[________________]

Category
[ Chest ▼ ]

Tracking Fields

☑ Completed
☑ Weight
☑ Sets
☑ Reps
☐ Duration
☐ Distance
☐ Calories
☐ Time

+ Add Custom Field

[ Save Exercise ]
```

The user should decide what information an exercise requires.

For example:

### Bench Press

```text
☑ Completed
Weight: 60 kg
Sets: 4
Reps: 10
```

### Running

```text
☑ Completed
Distance: 5 km
Duration: 30 min
Pace: 6:00/km
```

This makes the application flexible rather than creating separate fixed screens for every type of exercise.

---

# 10. Workout Plan

Users should be able to create their own weekly workout schedule.

Example:

```text
Weekly Plan

Monday
🏋️ Chest + Triceps

Tuesday
🏋️ Back + Biceps

Wednesday
🧘 Rest / Mobility

Thursday
🏋️ Legs

Friday
🏋️ Shoulders + Abs

Saturday
🏃 Running

Sunday
🧘 Rest
```

Allow the user to customize this completely.

They should be able to:

- Add exercise
- Remove exercise
- Reorder exercises
- Assign exercises to specific days
- Create multiple exercises on one day
- Mark a day as rest
- Copy one week's plan to another week
- Change the plan for a specific date

---

# 11. Custom Tracking Fields

This is a major feature.

Users should be able to add their own metrics.

Examples:

```text
Custom Metrics

☑ Weight
☑ Waist
☐ Chest
☐ Arm
☐ Thigh
☐ Body Fat %
☐ Sleep
☐ Calories
☐ Steps

+ Add Custom Metric
```

When creating a custom metric:

```text
Add Metric

Name:
[ Chest Size ]

Unit:
[ cm ]

Type:
[ Number ▼ ]

Track:
☑ Daily
☐ Weekly

[ Save ]
```

Allow:

- Number
- Decimal
- Text
- Yes/No
- Duration
- Distance
- Percentage

---

# 12. Weight Tracking

Weight should have its own clean progress chart.

Example:

```text
Weight Progress

72 kg ┤ ●
      │   ╲
71 kg ┤    ●
      │      ╲
70 kg ┤       ●──●
      │
69 kg ┤             ●
      └────────────────
        Sep  Oct  Nov
```

Allow:

- Daily
- Weekly
- Monthly
- 3 months
- 6 months
- 1 year
- All time

Show:

```text
Current Weight     70.2 kg
Starting Weight    74.0 kg
Change             -3.8 kg
```

---

# 13. Waist / Belly Size Tracking

Create a separate chart.

```text
Waist Progress

90 cm ┤ ●
      │  ╲
88 cm ┤   ●
      │    ╲
86 cm ┤      ●
      │        ●
84 cm ┤
      └────────────────
```

Show:

```text
Current Waist      84 cm
Starting Waist     89 cm
Change             -5 cm
```

Users should be able to rename this metric.

For example:

- Waist
- Belly
- Abdomen
- Chest
- Thigh

---

# 14. Cardio Tracking

Cardio should have its own section.

Example:

```text
🏃 Running

Total Distance
127.4 km

Total Runs
24

Average Distance
5.3 km

Longest Run
10.2 km
```

Charts:

- Distance per workout
- Running frequency
- Duration
- Pace
- Weekly distance
- Monthly distance

The same system should support cycling, walking and other cardio activities.

---

# 15. Calendar Day Information

Each calendar day should have a large expandable information box.

Example:

```text
┌─────────────────────────────────┐
│ OCTOBER 3                 🟢    │
├─────────────────────────────────┤
│                                 │
│ 🏋️ Chest                       │
│ 🏋️ Triceps                     │
│ 🏃 Running 5.2 km               │
│                                 │
│ Weight     70.4 kg              │
│ Waist      84 cm                │
│                                 │
└─────────────────────────────────┘
```

The green/red status should be visually obvious.

The detailed information should remain visible as a list.

---

# 16. Calendar Filters

Allow users to filter the calendar.

Examples:

```text
[ All ]

[ 🏋️ Strength ]

[ 🏃 Cardio ]

[ Weight ]

[ Waist ]

[ Custom ]
```

For example, selecting "Running" should highlight only days where running was tracked.

---

# 17. Workout Statistics

Create a simple dashboard.

Example:

```text
This Month

🔥 Workout Streak
8 days

🏋️ Workouts
18 / 22

📈 Completion
82%

🏃 Running
42 km

⚖️ Weight
-1.8 kg

📏 Waist
-2 cm
```

Also show:

```text
Workout Consistency

████████░░ 82%
```

Do not make statistics complicated.

---

# 18. Streak

Include an optional workout streak.

Example:

```text
🔥 Current Streak
7 Days

🏆 Longest Streak
23 Days
```

The streak should be calculated from **exercise completion only**.

Entering weight or waist does not count as a workout.

---

# 19. Missed Workout Handling

At the end of each day:

If the user had a planned workout and did not complete it:

```text
🔴 MISSED

Chest + Triceps
October 2
```

If the user had no workout planned:

```text
⚪ REST DAY
```

Do not mark rest days as missed.

Allow users to edit historical days.

If a user later records a missed workout as completed, update the calendar accordingly.

---

# 20. Customization

Every user should have their own:

```text
Workout Plan
Exercise List
Exercise Tracking Fields
Custom Metrics
Calendar
Measurements
History
Statistics
Preferences
```

One user changing an exercise must NOT modify another user's configuration.

---

# 21. UX Requirements

The application must feel like a modern premium fitness app.

Design principles:

- Clean
- Minimal
- Fast
- Mobile-first
- Large touch targets
- Clear typography
- Rounded cards
- Subtle animations
- Excellent spacing
- Dark mode + light mode
- Avoid unnecessary screens
- Avoid overwhelming the user with data

The daily logging process should take **less than 10 seconds** for a normal workout.

For example:

```text
Open app
↓
Today
↓
Tap Chest
↓
Tap Triceps
↓
Done ✓
```

Detailed weight/reps/etc. should be optional.

---

# 22. Quick Add

The home screen should have a prominent:

```text
+ LOG TODAY'S WORKOUT
```

button.

This opens today's planned exercises immediately.

Example:

```text
Today's Workout

☐ Chest
☐ Triceps
☐ Cardio

[ Mark Selected Complete ]

Weight
[ 70.2 kg ]

Waist
[ 84 cm ]

[ SAVE ]
```

---

# 23. Edit Historical Data

Users must be able to tap any previous date and edit it.

Allow:

- Add exercise
- Remove exercise
- Change completion
- Add weight
- Change weight
- Add waist
- Add cardio
- Add custom metrics
- Add notes

---

# 24. Dashboard Layout

Home screen:

```text
┌─────────────────────────────┐
│ 👤 Saurabh             ▼    │
│                             │
│ Wednesday, October 3        │
│                             │
│ 🔥 7 Day Streak             │
├─────────────────────────────┤
│                             │
│ TODAY                       │
│                             │
│ ☑ Chest                     │
│ ☑ Triceps                   │
│ ☐ Running                   │
│                             │
│        🟡 IN PROGRESS       │
│                             │
│ [ Complete Workout ]        │
├─────────────────────────────┤
│                             │
│ Weight       70.2 kg        │
│ Waist        84 cm          │
│                             │
├─────────────────────────────┤
│                             │
│ 📅 October                  │
│                             │
│  🟢 🟢 🔴 🟢 🟢 ⚪ 🟢       │
│  🟢 🔴 🟢 🟢 🟢 🟢 ⚪       │
│                             │
└─────────────────────────────┘
```

---

# 25. Data Model

Design the backend around users rather than one global exercise configuration.

Suggested logical entities:

```text
User
 ├── id
 ├── name
 ├── avatar
 ├── created_at
 └── settings

Exercise
 ├── id
 ├── user_id
 ├── name
 ├── category
 ├── tracking_fields
 └── active

WorkoutPlan
 ├── id
 ├── user_id
 ├── day_of_week
 └── exercise_ids

WorkoutRecord
 ├── id
 ├── user_id
 ├── date
 ├── exercise_id
 ├── completed
 ├── values
 └── notes

Measurement
 ├── id
 ├── user_id
 ├── date
 ├── metric_id
 └── value

CustomMetric
 ├── id
 ├── user_id
 ├── name
 ├── unit
 └── type
```

Use `user_id` consistently so data isolation is guaranteed.

---

# 26. Important Business Logic

Implement these rules carefully.

### Exercise completion

```text
If all required planned exercises are completed:
    status = GREEN

If some required exercises are completed:
    status = YELLOW

If planned exercises are not completed
AND current date/time is after the day:
    status = RED

If no workout is scheduled:
    status = REST
```

### Future date

Never show a future workout as missed.

### Measurements

Measurements are independent of workout completion.

### Rest day

Rest day is neither completed nor missed.

### User switching

Changing active user immediately changes all displayed data.

---

# 27. Notifications

Make notifications optional.

Examples:

```text
🏋️ Workout Reminder

Your Chest + Triceps workout is waiting for you.
```

And optionally:

```text
⚠️ Workout missed

You had a planned workout today.
```

Users should be able to disable notifications.

---

# 28. Privacy

Because this is a multi-user family application:

- Separate user data logically
- Never show one user's private measurements to another unless explicitly permitted
- Protect authentication
- Validate all `user_id` access on the backend
- Never trust user IDs supplied directly by the client
- Users should only access their own records unless they have explicit permission

---

# 29. Visual Style

Create a polished fitness application rather than a generic CRUD dashboard.

Use:

- Modern typography
- Large numbers
- Rounded cards
- Subtle shadows
- Smooth transitions
- Clear green/red workout states
- Beautiful calendar
- Progress charts
- Clean icons
- Responsive design

Avoid:

- Excessive gradients
- Tiny text
- Crowded tables
- Too many buttons
- Complicated navigation

The application should feel somewhere between a premium fitness tracker and a beautifully designed personal productivity calendar.

---

# 30. Most Important Product Principle

Do NOT make the application primarily about weight tracking.

The hierarchy should be:

### 1. 🏋️ Exercise consistency
The main purpose.

### 2. 📅 Calendar history
See exactly which days were completed or missed.

### 3. 🧩 User customization
Each person can create their own exercises, workout plans and tracking fields.

### 4. 📊 Progress
Weight, waist, cardio and custom measurements.

### 5. 👨‍👩‍👧 Multi-user
Easy switching while keeping every user's data separate.

The application should answer one question immediately:

> **"Did I do my planned workout today, and what exactly did I do?"**

Everything else should support that goal.



app must support github web hosting 