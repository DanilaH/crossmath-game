"""Measure exact repeats along the fresh 0.5.7 campaign in this repository."""
import json
from collections import Counter
from pathlib import Path

PRODUCT = Path(__file__).resolve().parents[1] / "spec/product"


def read(relative):
    return json.loads((PRODUCT / relative).read_text())


def survey(boards, empty_only):
    last = {}
    gaps = Counter()
    examples = []
    for index, board in enumerate(boards, 1):
        xy = tuple(sorted((cell["x"], cell["y"]) for cell in board["cells"]
                          if not empty_only or "given" not in cell))
        key = (board["width"], board["height"], xy)
        if key in last:
            previous = last[key]
            gaps[index - previous] += 1
            if len(examples) < 5:
                examples.append([previous, index])
        last[key] = index
    return {"positions": len(boards), "uniqueKeys": len(last), "adjacentRepeats": gaps[1],
            "repeatWithinPrior10": sum(n for gap, n in gaps.items() if gap <= 10),
            "firstRepeatedPositionPairs": examples}


def main():
    old = {b["puzzleId"]: b for b in read("content_v09/boards.json")}
    route = read("content_v09/routes.json")["campaignSequence"]
    new = read("content_v2/boards.json")
    campaign = [old[key] for key in route[:15]] + sorted(
        (board for board in new if board["bucket"] != "daily"), key=lambda b: b["campaignPosition"])
    assert len(campaign) == 240 and len({b["puzzleId"] for b in campaign}) == 240
    result = {name: {"emptyCoordinates": survey(boards, True), "allNumberCoordinates": survey(boards, False)}
              for name, boards in (("wholeCampaign", campaign), ("afterLessons", campaign[15:]))}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
