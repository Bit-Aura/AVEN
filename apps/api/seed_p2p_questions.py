import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Import the base and models so we can create tables
from app.models.base import Base
from app.models.p2p import P2PQuestion
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

questions = [
    {
        "topic": "DATA_STRUCTURES",
        "difficulty": "Medium",
        "question_text": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]",
        "solution_guidelines": "The optimal solution uses a Hash Map (Dictionary in Python) to store the elements and their indices as we iterate through the array.\n\nAlgorithm:\n1. Initialize an empty hash map.\n2. Iterate through the array. For each element `x` at index `i`:\n3. Calculate the difference `target - x`.\n4. If the difference exists in the hash map, return its index and `i`.\n5. Otherwise, add `x` and its index `i` to the hash map.\n\nTime Complexity: O(n)\nSpace Complexity: O(n)"
    },
    {
        "topic": "DATA_STRUCTURES",
        "difficulty": "Medium",
        "question_text": "Given a string `s`, find the length of the longest substring without repeating characters.\n\nExample 1:\nInput: s = \"abcabcbb\"\nOutput: 3 (The answer is \"abc\", with the length of 3.)\n\nExample 2:\nInput: s = \"pwwkew\"\nOutput: 3",
        "solution_guidelines": "Use the Sliding Window technique with a Set or Hash Map to track the characters in the current window.\n\nAlgorithm:\n1. Initialize two pointers, `left` and `right`, both at the start of the string, and a set to store characters.\n2. Expand the window by moving `right`. If `s[right]` is not in the set, add it and update the max length.\n3. If `s[right]` is in the set, shrink the window by moving `left` and removing `s[left]` from the set until `s[right]` can be added.\n\nTime Complexity: O(n)\nSpace Complexity: O(min(n, m)) where m is the charset size."
    },
    {
        "topic": "DATA_STRUCTURES",
        "difficulty": "Medium",
        "question_text": "Given the `head` of a singly linked list, reverse the list, and return the reversed list.\n\nExample:\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]",
        "solution_guidelines": "Use three pointers to reverse the links iteratively.\n\nAlgorithm:\n1. Initialize `prev` to NULL and `curr` to `head`.\n2. While `curr` is not NULL:\n   a. Store `curr.next` in a temporary `next_temp` variable.\n   b. Set `curr.next` to `prev` (this reverses the link).\n   c. Move `prev` to `curr`.\n   d. Move `curr` to `next_temp`.\n3. Return `prev` as the new head.\n\nTime Complexity: O(n)\nSpace Complexity: O(1)"
    },
    {
        "topic": "DATA_STRUCTURES",
        "difficulty": "Medium",
        "question_text": "Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.\n\nExample:\nInput: intervals = [[1,3],[2,6],[8,10],[15,18]]\nOutput: [[1,6],[8,10],[15,18]]\nExplanation: Since intervals [1,3] and [2,6] overlap, merge them into [1,6].",
        "solution_guidelines": "Sort the intervals first based on their start times, then merge overlapping ones iteratively.\n\nAlgorithm:\n1. If the list is empty, return an empty list.\n2. Sort the intervals by their start time.\n3. Initialize a `merged` list with the first interval.\n4. Iterate through the sorted intervals:\n   a. If the current interval's start is <= the last merged interval's end, they overlap. Update the last merged interval's end to `max(last_end, curr_end)`.\n   b. Else, they don't overlap. Append the current interval to `merged`.\n\nTime Complexity: O(n log n) due to sorting.\nSpace Complexity: O(n) for the output array or sorting space."
    }
]

async def seed():
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    print("Seeding P2PQuestions...")
    async with AsyncSessionLocal() as db:
        # Clear existing questions
        await db.execute(text("DELETE FROM p2p_questions"))
        
        for q_data in questions:
            q = P2PQuestion(**q_data)
            db.add(q)
            
        await db.commit()
        print("Questions seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
