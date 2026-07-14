# Critical Review: CourtSync Development & Implementation

## Overview of the Project

CourtSync was developed as a badminton session management and rating system designed to streamline court bookings, player matchmaking, and competitive rating tracking for badminton clubs and casual players. The application provides real-time session management, Glicko-2 based rating calculations, leaderboard functionality, and accessibility features like dyslexia mode. While the core functionality is operational, the development process exposed significant gaps in project planning, time allocation, and feature prioritization that directly impacted both the scope of the deliverable and the quality of project documentation.

## Time Allocation Imbalance: Development Over Documentation

The most glaring mistake made during this project was the disproportionate investment of time in development and CI/CD infrastructure at the expense of comprehensive project reporting and analysis. A significant portion of the final weeks were spent optimizing deployment pipelines, containerization, and backend robustness—all valuable engineering work, but work that ultimately took away from what should have been the primary deliverable: a thorough, well-reasoned project report.

In hindsight, I should have established a hard stop on feature development by week 8 out of a 12-week cycle, allowing the remaining time for rigorous documentation, analysis, and critical evaluation of design decisions. Instead, I found myself in the final fortnight still tweaking API endpoints, refactoring session state management, and debugging edge cases in the rating calculation logic. This left the report writing compressed into the last week, which inevitably led to rushed analysis, incomplete sections on testing methodologies, and shallow coverage of failure modes and lessons learned. The irony is that an engineering project is only as strong as its documentation—and I weakened mine by over-engineering the codebase.

## Feature Scope Creep and Compromised Delivery

Related to the above, I spent considerable effort building features that, while nice to have, were not essential to the core value proposition. The implementation of Socket.IO for real-time match updates, for example, was partially integrated but not fully tested or documented. Similarly, the session history view and the leaderboard scoping logic became increasingly complex as I tried to handle edge cases around guest players, shared sessions across multiple admins, and achievement badge logic. Each of these added richness to the product but subtracted from focus.

What I should have done was ruthlessly prioritize. The MVP should have been: create a session, start matches, end a match with rating update, and view your personal stats. The leaderboard, session history, and accessibility features were originally planned as "nice to have" but drifted into the core scope through incremental feature creep. By the time I realized this, half the development time was gone, and walking back features felt wasteful.

## Missed Opportunities and Cut Corners

Several valuable features were deliberately left out or only partially implemented due to time constraints, and in retrospect, some of these deserved more effort or earlier inclusion in the pipeline.

**Google OAuth and Third-Party Authentication**: The authentication system currently requires manual registration with username and password. Integrating Google Sign-In would have dramatically lowered the barrier to entry and reduced friction for casual players who just want to quickly join a session. The infrastructure for this exists in most modern auth libraries, and implementing it would have taken perhaps two days. Instead, I prioritized match logic refinement over user onboarding experience.

**Landing Page and Marketing Presence**: There is no public-facing landing page. A user navigating to the app immediately hits the auth screen, which is functional but uninviting. A simple landing page explaining the features, showing a screenshot of the leaderboard, and providing social proof (e.g., "Join 50+ players in your area") would have significantly improved the perceived polish of the project. This was a deliberate cut due to time, but it hurt the overall presentation.

**AI-Driven Recommendations**: The code currently handles basic skill-based matchmaking via the `selectClosestByRating` function, which simply pairs players with the nearest rating. A more sophisticated system could have analyzed historical match data (which we have in `matchHistory`) to recommend which players tend to pair well, or to suggest training focus areas based on win/loss patterns against specific opponents. Integrating a simple machine learning model would have been impressive and added genuine value, but it felt like a "feature after the fact" once the basic system was running.

**Guest Player Persistence and Evolution**: The codebase currently treats guest players (those without registered accounts) as session-only entities. Their ratings are calculated temporarily, but there's no easy path for them to upgrade to full user accounts and carry over their session history. This is a gap that became apparent late in testing—a guest who plays well one evening has no way to claim their progress. Solving this would require a more nuanced onboarding flow, but it's a friction point that compromises the social stickiness of the app.

## Feature Sprint Management: A Lesson in Discipline

Another critical weakness was the lack of formal feature sprint discipline. I maintained a loose kanban-style board but didn't enforce hard sprint boundaries or velocity tracking. This led to a pattern where I'd start a feature (e.g., session leaderboard filtering), encounter a related bug or complexity, and pivot mid-sprint to fix it before moving on. By the time the project entered the final stretch, I'd lost track of which features were partially done versus complete.

A proper two-week sprint cycle with planning poker, daily standups, and sprint reviews would have caught scope creep earlier and forced prioritization conversations before they became crises. For instance, the session history view underwent three separate refactors as requirements clarified; a structured approach might have clarified requirements once upfront and avoided rework.

## Data Consistency and Edge Cases

While the core rating calculation using Glicko-2 is sound, the way user data flows through the system revealed several consistency issues that weren't fully addressed. For example, if a session ends abruptly (e.g., server restart), the database state might be partially updated—matches marked as finished but ratings not yet applied to users. The leaderboard scoping logic, while clever, relies on scanning all sessions to find shared players, which could perform poorly with hundreds of sessions. These were identified during testing but left as technical debt due to time constraints.

Similarly, the handling of guest players who play in sessions but don't have persisted accounts creates a bifurcated data model. The session stores guest player objects with ratings, but those ratings don't sync to a user profile because the guest has no profile. This isn't a showstopper, but it's inelegant and reduces the value of the matchmaking data for repeat guests.

## Testing and Acceptance Criteria

The project was tested via manual user scenarios and basic happy-path testing, but never underwent formal acceptance testing with actual users. The use cases defined in the design phase (UC-04 cloud sync, UC-06 leaderboard rankings) were validated by code review rather than real stakeholder feedback. A proper testing phase with club members or casual players would have surfaced usability issues—for example, the session management UI is dense and might overwhelm a non-technical player—but there simply wasn't time allocated for this.

## What Went Well

It's worth noting that despite these criticisms, the core system works reliably. The rating system produces sensible outputs, the session state management is robust, and the UI is accessible and responsive. The Glicko-2 integration was chosen deliberately and implemented correctly, the backend API design is clean, and the database schema is well-normalized. These engineering decisions show a solid understanding of the problem domain and represent genuine technical growth over the course of the project.

The accessibility features—dyslexia mode, font scaling, high-contrast UI—were a thoughtful addition that shows consideration for diverse users, even if they weren't part of the initial spec. The decision to use role-based route protection and token-based auth reflects good security practices, though not explicitly tested.

## Lessons and Recommendations for Future Work

If I were to restart this project, I would:

1. **Timebox development ruthlessly**: Set a hard cutoff date for new features (e.g., end of week 8), and spend the remaining time on stabilization, testing, and documentation.

2. **Define MVP and stick to it**: The MVP should be session creation → match assignment → rating update → personal stats view. Everything else is enhancement.

3. **Allocate report writing time equally**: Documentation should get the same calendar reservation as code development, not be squeezed in at the end.

4. **Implement proper sprint discipline**: Use two-week sprints with fixed scope, even if flying solo. This forces prioritization and prevents scope creep.

5. **Plan for user testing**: Reserve the final two weeks for acceptance testing with real users, not for bug fixes and last-minute refactors.

6. **Cut low-ROI features early**: Google OAuth and landing pages would have taken three days combined and added immense value; they should have been in the MVP, not cut.

## Conclusion

CourtSync successfully demonstrates the core concept of a cloud-synced, rating-based session management system for badminton, and the codebase is a foundation on which to build. However, the project was constrained by poor time allocation and feature prioritization, resulting in a gap between what could have been accomplished and what was. The sacrificed comprehensiveness in the project report directly reflects this imbalance. The technical implementation is sound, but the project management and delivery discipline were lacking. These are lessons that will inform future work: engineering is only half the battle; planning, communication, and ruthless prioritization are equally critical to successful delivery.
