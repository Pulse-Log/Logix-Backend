import { IsNotEmpty } from "class-validator";
import { User } from "src/global-guard/interface/userId.interface";

export class SourceDto{
    @IsNotEmpty({always: true, message: "Configuration not provided"})
    configuration: Record<string, any>;
    @IsNotEmpty({always: true, message: "Interface not provided"})
    interface: string;
}
export class CreateProjectDto implements User{
    userId: string;

    @IsNotEmpty({always: true, message: "Name not provided"})
    name: string;
    @IsNotEmpty({always: true, message: "Description not provided"})
    description: string;

    @IsNotEmpty({always: true, message: "Source not provided"})
    source: SourceDto;
}
