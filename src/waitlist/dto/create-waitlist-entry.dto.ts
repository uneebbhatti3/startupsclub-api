import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  Validate,
  ValidatorConstraint,
} from "class-validator";
import type { ValidationArguments, ValidatorConstraintInterface } from "class-validator";

/**
 * Request body for `POST /api/v1/waitlist`, with its validation rules. Text is trimmed and the
 * email lowercased before validation, so stored values are normalised.
 *
 * @packageDocumentation
 */

/** Roles accepted by the API (lowercase); the database stores them as the `waitlist_role` enum. */
export const WAITLIST_ROLES = ["founder", "developer", "other"] as const;

/** One of {@link WAITLIST_ROLES}. */
export type WaitlistRoleValue = (typeof WAITLIST_ROLES)[number];

/** Longest free-text role a user may enter. */
export const ROLE_OTHER_MAX_LENGTH = 50;

/**
 * Trims strings and leaves other values for the validators to reject.
 *
 * @param params - class-transformer parameters.
 * @returns The trimmed value.
 */
function trim({ value }: TransformFnParams): unknown {
  return typeof value === "string" ? value.trim() : value;
}

/**
 * Trims and lowercases strings.
 *
 * @param params - class-transformer parameters.
 * @returns The normalised value.
 */
function trimLowercase({ value }: TransformFnParams): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

/**
 * `roleOther` must be a non-empty string of at most 50 characters when `role` is `other`, and
 * must be absent for any other role.
 */
@ValidatorConstraint({ name: "roleOtherMatchesRole" })
export class RoleOtherMatchesRole implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const { role } = args.object as { role?: unknown };
    if (role !== "other") {
      return value === undefined;
    }
    return typeof value === "string" && value.length > 0 && value.length <= ROLE_OTHER_MAX_LENGTH;
  }

  defaultMessage(args: ValidationArguments): string {
    const { role } = args.object as { role?: unknown };
    return role === "other"
      ? `roleOther is required when role is "other" (1 to ${ROLE_OTHER_MAX_LENGTH} characters)`
      : 'roleOther is only allowed when role is "other"';
  }
}

export class CreateWaitlistEntryDto {
  @ApiProperty({ example: "Ada Lovelace", maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: "ada@example.com",
    maxLength: 254,
    description: "Stored trimmed and lowercased.",
  })
  @Transform(trimLowercase)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ enum: WAITLIST_ROLES, example: "founder" })
  @IsIn(WAITLIST_ROLES)
  role: WaitlistRoleValue;

  @ApiPropertyOptional({
    example: "Designer",
    maxLength: ROLE_OTHER_MAX_LENGTH,
    description: 'Required when role is "other"; must be omitted otherwise.',
  })
  @Transform(trim)
  @Validate(RoleOtherMatchesRole)
  roleOther?: string;
}
