# Leave Management System - Non-Technical Project Flow

This document outlines the entire flow of the project in simple, non-technical terms. It is designed to help anyone understand how the system works, from logging in to managing complex administrative tasks.

## 1. Introduction
This project is a digital **Leave Management System**. It replaces old-school paper forms or email chains with a simple website. Employees use it to ask for time off, and managers use it to say "Yes" or "No". It keeps track of everything automatically so no one has to count days on a calendar manually.

## 2. Who Uses This System? (The Roles)
There are four main types of people who use this system. The screen they see depends on who they are:

1.  **Employee**: The regular staff member. They initiate the process (Applying for leave).
2.  **Manager**: The Team Leader. They approve or reject requests from their team.
3.  **HR (Human Resources)**: The Overseer. They track attendance, manage holidays, and generate reports.
4.  **HR Assistant**: The Support. A specialized role with granular permissions controlled by HR. They can help with attendance, leave requests, or user management based on what HR allows.
5.  **Super Admin**: The Owner/Tech Lead. They have the keys to the entire system (adding users, fixing settings).

---

## 3. The General Flow (How it Works)

### Step 1: Logging In
*   **Action**: Everyone visits the website and sees a Login Screen.
*   **Process**: They enter their Username and Password.
*   **Magic**: The system checks who they are.
    *   If it's John (Employee) -> He goes to the **Employee Dashboard**.
    *   If it's Sarah (Manager) -> She goes to the **Manager Dashboard**.
    *   If it's Mike (HR) -> He goes to the **HR Dashboard**.
    *   If it's The Boss (Super Admin) -> They go to the **Super Admin Dashboard**.

---

## 4. Detailed Flows by Role

### A. The Employee Flow (Regular Staff)
*Goal: "I want to take a holiday."*

1.  **Dashboard View**: Upon login, they see their "Home Base".
    *   They immediately see how many leave days they have left (e.g., Casual Leave: 5 days, Sick Leave: 2 days).
    *   They see a list of their past leave requests and their status (Approved, Rejected, or Pending).
2.  **Applying for Leave**:
    *   They click a big button: **"Apply Leave"**.
    *   A simple form appears.
    *   **Calender**: They pick the Start Date and End Date.
        *   *Smart Feature*: If they pick a Public Holiday, the system automatically fills in the reason (e.g., "Christmas").
    *   **Reason**: If it's a normal day, they type why they need off (e.g., "Personal work").
    *   **Type**: They choose the type of leave (Sick, Casual, Permission).
    *   They hit **Submit**.
3.  **Waiting**: The request is now sitting in their Manager's "Inbox". The status shows "Pending" in yellow.
4.  **Result**:
    *   If Approved: Status turns Green. They can go on holiday!
    *   If Rejected: Status turns Red. They might need to talk to their manager.

### B. The Manager Flow (Team Leaders)
*Goal: "I need to manage my team's attendance."*

1.  **Dashboard View**:
    *   They see a **"Pending Approvals"** card. This is their "To-Do" list.
    *   It shows requests specifically from *their* team members.
2.  **Approving Leave**:
    *   They click "View" on a request.
    *   They can see who is asking, for when, and why.
    *   **Team Calendar**: Before saying yes, they can look at a calendar view to see if *other* people are already off on those days (to avoid being understaffed).
    *   They click **Approve** or **Reject**. The employee gets notified (status updates).
3.  **Applying for Own Leave**:
    *   Managers are employees too! They have an "Apply Leave" section just like regular staff.
    *   *Difference*: Their request doesn't go to themselves; it goes to HR or the Super Admin for approval.

### C. The HR Flow (Human Resources)
*Goal: "I need to track the whole company."*

1.  **Dashboard View**: A high-level control center.
    *   **"Today's Status"**: A live snapshot of who is Present, Absent, or on Leave right now across the company.
2.  **Management**:
    *   **Approvals**: HR can handle approvals if Supervisors are away or for special cases.
    *   **Attendance**: They can view a detailed list of every employee's status for the day.
3.  **Reports**:
    *   HR needs data. They can go to the **"Reports"** section.
    *   They select a month (e.g., "November 2024").
    *   The system generates a tidy report showing every employee and their total leaves for that month.
4.  **Holiday Settings**:
    *   HR sets the rules. They can add "Company Holidays" (like Diwali or Founder's Day) into the system so no one has to apply for those days manually.
5.  **Access Management**:
    *   HR Managers can configure exactly what an **HR Assistant** is allowed to do. 
    *   Example: "I want this assistant to be able to mark attendance but NOT approve leave requests."
    *   HR uses a simple checkbox system in Settings to grant or revoke these powers.

### D. The Super Admin Flow (System Admin)
*Goal: "I need to set up and maintain the system."*

1.  **Dashboard Overview**: The Master View.
2.  **User Management (The Directory)**:
    *   **Add User**: When a new person is hired, the Super Admin creates their account here. They set the Name, Password, Role (Manager/Staff), and Department.
    *   **Edit User**: If someone gets promoted or changes their phone number, the Super Admin updates it here.
    *   **Deactivate**: If someone leaves the company, the Super Admin disables their access.
3.  **System Settings**:
    *   They can see a full list of all departments and employees.
    *   They ensure the organizational structure (who reports to whom) is correct.

## 5. Key "Smart" Features
*   **Calendar Integration**: Not just a list of dates, but a visual calendar so Managers can see overlaps (e.g., "Oh, 3 people are already off on Friday, I can't approve a 4th").
*   **Auto-Calculation**: The system counts the days automatically. If you pick Monday to Wednesday, it knows that's 3 days.
*   **Mobile Frieldly**: The design works on phones, so Managers can approve leave while on the go.
