import { PartialType, OmitType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import { IsString, IsNotEmpty, ValidateNested, IsOptional } from "class-validator";
import { CreateProjectDto, SourceDto } from "./create-project.dto";
import { User } from "src/global-guard/interface/userId.interface";

export class UpdateProjectDto implements User {
    userId: string;
    name: string;
    description: string;
    source: UpdateSourceDto;
}

class UpdateSourceDto {
    configuration: Record<string, any>;
    interfaceId: string;
}
