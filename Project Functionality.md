*Creator Page*

*Function*
1. Section Submission Portal
    -> Multi-File Uploader: Support for ZIP files containing Liquid, CSS, and JS.
    -> Metadata Entry: Fields for Section Name, Category (e.g., Hero, Footer), and Documentation/Instructions.
    -> Unique ID Generation: Once a draft is saved, the system automatically assigns the SEC-XXXX ID.

2. Real-Time Status
    -> Status Badges: Clear visual indicators (e.g., Yellow for In Testing, Red for Issue Logged).
    -> Actionable Tasks: Only sections in "Draft" or "Issue Logged" should be editable by the Creator.

3. Integrated "Issue Feedback" Viewer
    ->Bug Report Display: A table showing "Issue Type," "Severity," and "Description" provided by the Tester.
    ->Screenshot Gallery: A lightbox to view the visual bugs reported by QA.
    ->Comment Thread: A direct line to the Tester for clarifying questions on a specific issue.

4. Designer Hand-off Notification
    ->Once a section moves to "QA Passed," the Creator should receive a notification that their code is now with the Designer.
    ->Design Progress Tracker: A simple "View Only" status so the Creator knows when their section is getting its promotional assets.


*Tester Page*

*Function*
1. The "Testing Queue" (Active Assignments)
    ->Assigned to Me: A list of sections with the status Submitted (once assigned) or In Testing.
    ->Priority Flags: Sections marked with "High Priority" or those that have been sitting in the queue the longest.
    ->Claim System: An "Accept Task" button that moves a section from Submitted to In Testing, notifying the Creator that review has begun.

2. Section Audit Sandbox
    ->Source Download: A one-click button to download the latest .zip (V1, V2, etc.) of the Liquid/CSS/JS files.
    ->Code Preview: A read-only code snippet viewer (optional but helpful) to check for obvious syntax errors before installing.
    ->Documentation Viewer: A side-panel showing the Creator’s notes on how the section is supposed to behave.

3. The "Issue Tracker" Form
    ->Categorization Dropdown: Select from Bug, Styling, Responsive, or Functional.
    ->Severity Selector: Choose Critical (Blocks progress), Major (Needs fix), or Minor (Nitpick).
    ->Visual Evidence Uploader: Drag-and-drop area for screenshots or screen recordings showing the bug in action.
    ->Reproducible Steps: A text area to explain exactly how to trigger the issue.

4. Approval & Hand-off Trigger
    ->QA Passed Button: A confirmation action that automatically triggers two things:
        a.Changes status to QA Passed.
        b.Moves the section into the Designer Workspace queue.

    ->Internal Notes: A field for notes meant only for the Admin or Designer (e.g., "Code is very clean, should be easy to style").


*Designer Page*

*Function*
1. The "Ready for Design" Queue
    ->Incoming Tasks: A list of sections that have officially moved to QA Passed.
    ->Section Specs: Quick view of the section's intended use (e.g., "Mega Menu" or "Video Hero") so the designer knows the context for the graphics.
    ->Live Preview Link: A button to view the section in a staging environment to capture high-quality screenshots.

2. Asset Upload Suite
    ->Desktop Preview (16:9): Field for the primary high-resolution desktop mockup.
    ->Mobile Preview (9:16): Field for the mobile-responsive version mockup.
    ->Promotional Banner: Field for the store-front hero image or "Featured" thumbnail.
    ->File Validation: Automatic checking to ensure uploads meet required dimensions (e.g., 1920x1080) and file types (WebP/PNG).

3. "Submission for Review" Trigger
    ->Complete Design Button: A primary action that shifts the status from Designing to Ready for Store.
    ->Admin Ping: Automatically notifies the Admin that the section is fully "clothed" and ready for the live store.


*Admin Page*

*Function*
1. The Assignment Engine
    ->Tester Assignment Dropdown: A list of available Testers to assign to newly submitted sections.
    ->Workload Overview: See how many active "In Testing" tasks each Tester currently has before assigning more.

2. Centralized Repository Management
    ->Master File Access: Ability to download any ZIP file from any version (V1, V2, etc.) at any time.
    ->System Logs: View a timestamped history of who moved which section and when (Audit Trail).

3. Final Approval & "Go-Live" Module
    ->Final Review Checklist: A side-by-side view of the Designer's Assets (Desktop/Mobile previews) and the Tester’s QA Report.
    ->One-Click Publish: A "Publish to Store" button that moves the section to Published and triggers the live API/Storefront update.
    ->Rollback Capability: If an error is found post-launch, the Admin can revert a Published section back to Draft or Issue Logged.

4. User & Role Permissions
    ->User Management: Add/Remove Creators, Testers, and Designers.