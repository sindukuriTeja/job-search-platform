#!/usr/bin/env python3
"""
Test the resume parser and job matcher pipeline.
Parses the sample resume, then matches against sample jobs.
"""
import json, sys
sys.path.insert(0, '.')
from resume_parser import ResumeParser
from job_matcher import match_jobs

def main():
    parser = ResumeParser()

    # Parse resume
    print("=" * 60)
    print("JOB SEARCH PLATFORM — RESUME MATCHING TEST")
    print("=" * 60)

    resume_path = "sample_resume.txt"
    print(f"\n[1] Parsing resume: {resume_path}")
    resume_data = parser.parse_resume(resume_path)

    print(f"    Name: {resume_data['name']}")
    print(f"    Email: {resume_data['email']}")
    print(f"    Phone: {resume_data['phone']}")
    print(f"    Skills ({len(resume_data['skills'])}): {', '.join(resume_data['skills'][:10])}...")
    print(f"    Experience years: {resume_data['experience_years']}")
    print(f"    Education entries: {len(resume_data['education'])}")
    print(f"    Projects: {len(resume_data['projects'])}")
    print(f"    Certifications: {len(resume_data['certifications'])}")
    print(f"    Keywords: {', '.join(resume_data['keywords'][:10])}...")

    # Sample jobs for Hyderabad, 0-1 years experience
    sample_jobs = [
        {
            "title": "Junior Software Developer",
            "company": "Tech Corp",
            "location": "Hyderabad",
            "description": "We are looking for a junior software developer with Python and JavaScript skills. Experience with React and Node.js is a plus. Freshers welcome.",
            "url": "https://example.com/job1",
            "portal": "Sample",
        },
        {
            "title": "Machine Learning Intern",
            "company": "AI Labs",
            "location": "Hyderabad",
            "description": "Internship in machine learning and deep learning. Working with TensorFlow and PyTorch. Knowledge of NLP and computer vision preferred.",
            "url": "https://example.com/job2",
            "portal": "Sample",
        },
        {
            "title": "Blockchain Developer",
            "company": "CryptoTech",
            "location": "Hyderabad",
            "description": "Develop smart contracts using Solidity. Experience with Ethereum and blockchain technology required. 0-1 years experience.",
            "url": "https://example.com/job3",
            "portal": "Sample",
        },
        {
            "title": "Data Analyst",
            "company": "DataDriven Inc",
            "location": "Hyderabad",
            "description": "Analyze data using Python, pandas, and SQL. Create visualizations with matplotlib and plotly. Experience with data science projects preferred.",
            "url": "https://example.com/job4",
            "portal": "Sample",
        },
        {
            "title": "Full Stack Developer",
            "company": "StartupXYZ",
            "location": "Hyderabad",
            "description": "Build web applications using React, Node.js, and MongoDB. Docker and AWS experience preferred. Agile/scrum environment.",
            "url": "https://example.com/job5",
            "portal": "Sample",
        },
        {
            "title": "Python Developer",
            "company": "CodeWorks",
            "location": "Hyderabad",
            "description": "Develop backend services using Python and Django. REST API development, PostgreSQL, Redis. Git and CI/CD experience required.",
            "url": "https://example.com/job6",
            "portal": "Sample",
        },
        {
            "title": "DevOps Engineer",
            "company": "CloudFirst",
            "location": "Hyderabad",
            "description": "Set up CI/CD pipelines, manage AWS infrastructure, Docker and Kubernetes. Linux and scripting skills required.",
            "url": "https://example.com/job7",
            "portal": "Sample",
        },
        {
            "title": "IoT Developer",
            "company": "SmartDevices",
            "location": "Hyderabad",
            "description": "Develop IoT solutions integrating sensors with ML models. Python, C++, and embedded systems experience needed.",
            "url": "https://example.com/job8",
            "portal": "Sample",
        },
    ]

    # Match jobs
    print(f"\n[2] Matching {len(sample_jobs)} sample jobs against resume...")
    print(f"    Preferred location: Hyderabad")
    print(f"    Experience level: 0-1 years")
    matched = match_jobs(sample_jobs, resume_data, preferred_location="Hyderabad", experience_level="0-1 years")

    print(f"\n    Matched jobs: {len(matched)}")
    print()

    if matched:
        print("MATCHED JOBS (sorted by relevance):")
        print("-" * 60)
        for i, job in enumerate(matched, 1):
            print(f"\n  #{i} — {job['title']} at {job['company']}")
            print(f"     Location: {job['location']}")
            print(f"     Match: {job['match_percentage']}% ({job['match_level']})")
            print(f"     Matched skills: {', '.join(job['matched_skills'][:5]) or 'none'}")
            print(f"     Missing skills: {', '.join(job['missing_skills'][:3]) or 'none'}")
            print(f"     Portal: {job['portal']}")
            print(f"     URL: {job['url']}")
    else:
        print("  No matching jobs found.")

    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)

if __name__ == '__main__':
    main()