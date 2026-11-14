import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateWaitlistEntryDto } from "./create-waitlist-entry.dto";

/**
 * Unit tests for the waitlist request DTO: normalisation and every validation rule.
 *
 * @packageDocumentation
 */

/**
 * Transforms a plain body like the ValidationPipe does and returns the failing properties.
 *
 * @param body - The request body.
 * @returns The DTO instance and the names of properties that failed.
 */
async function check(
  body: Record<string, unknown>,
): Promise<{ dto: CreateWaitlistEntryDto; failed: string[] }> {
  const dto = plainToInstance(CreateWaitlistEntryDto, body);
  const errors = await validate(dto);
  return { dto, failed: errors.map((error) => error.property) };
}

const valid = { name: "Test User", email: "test.user@example.com", role: "founder" };

describe("CreateWaitlistEntryDto", () => {
  it("accepts a valid founder", async () => {
    await expect(check(valid)).resolves.toMatchObject({ failed: [] });
  });

  it("trims the name and trims and lowercases the email", async () => {
    const { dto, failed } = await check({
      ...valid,
      name: "  Test User  ",
      email: "  Test.User@Example.COM ",
    });

    expect(failed).toEqual([]);
    expect(dto.name).toBe("Test User");
    expect(dto.email).toBe("test.user@example.com");
  });

  it("accepts other with a roleOther and trims it", async () => {
    const { dto, failed } = await check({ ...valid, role: "other", roleOther: "  Designer " });

    expect(failed).toEqual([]);
    expect(dto.roleOther).toBe("Designer");
  });

  it.each([
    ["an empty name", { ...valid, name: "   " }, "name"],
    ["a name over 100 characters", { ...valid, name: "a".repeat(101) }, "name"],
    ["an invalid email", { ...valid, email: "not-an-email" }, "email"],
    ["an unknown role", { ...valid, role: "investor" }, "role"],
    ["an uppercase role", { ...valid, role: "FOUNDER" }, "role"],
    ["other without roleOther", { ...valid, role: "other" }, "roleOther"],
    ["other with a blank roleOther", { ...valid, role: "other", roleOther: "  " }, "roleOther"],
    [
      "roleOther over 50 characters",
      { ...valid, role: "other", roleOther: "a".repeat(51) },
      "roleOther",
    ],
    ["roleOther with a non-other role", { ...valid, roleOther: "Designer" }, "roleOther"],
  ])("rejects %s", async (_label, body, property) => {
    const { failed } = await check(body);
    expect(failed).toContain(property);
  });
});
