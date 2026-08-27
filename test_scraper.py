import asyncio
from apps.api.app.scraper.pipeline import JobScrapingPipeline

async def main():
    pipeline = JobScrapingPipeline()
    res = await pipeline.lever_source.fetch_raw_jobs("palantir")
    print(f"Palantir Lever Jobs: {len(res)}")
    if res:
        print(res[0]['text'])

asyncio.run(main())
