import {
  Post,
  Delete,
  Route,
  Tags,
  Security,
  Request,
  Path,
  Body,
  Controller,
  Res,
  TsoaResponse,
  SuccessResponse,
  Get,
  Query,
} from "tsoa";
import { AppDataSource, Like, Order, House, User } from "./models";
import type { JwtPayload } from "./utils";
import { getCurrentUser } from "./auth.middleware";

export interface OrderResponse {
  id: number;
  price: number;
  userId: number;
  houseId: number;
  username: string;
  avatarUrl: string | null;
  createdAt: Date;
  houseImageUrl: string;
  houseCaption: string;
  houseAddress: string;
  houseState: string;
  houseCity: string;
  houseZipCode: string;
  houseSize: string;
  housePrice: number;
}

@Route("houses/{houseId}")
@Tags("Interactions (Likes & Orders)")
export class InteractionController extends Controller {
  // @Security("jwt")
  @SuccessResponse(201, "Liked")
  @Post("like")
  public async likeHouse(
    @Request() req: Express.Request,
    @Path() houseId: number,
    @Res() notFoundResponse: TsoaResponse<404, { message: string }>
  ): Promise<{ message: string }> {
    // const currentUser = req.user as JwtPayload;
    const currentUser = getCurrentUser();

    const house = await AppDataSource.getRepository(House).findOneBy({
      id: houseId,
    });
    if (!house) return notFoundResponse(404, { message: "House not found." });

    const user = await AppDataSource.getRepository(User).findOneBy({
      id: currentUser.userId,
    });
    if (!user) throw new Error("User not found");

    const like = Like.create({ house: house, user, houseId, userId: user.id });
    await like.save();

    return { message: "House liked successfully" };
  }

  // @Security("jwt")
  @SuccessResponse(200, "Unliked")
  @Delete("unlike")
  public async unlikeHouse(
    @Request() req: Express.Request,
    @Path() houseId: number
  ): Promise<{ message: string }> {
    // const currentUser = req.user as JwtPayload;
    const currentUser = getCurrentUser();

    await AppDataSource.getRepository(Like).delete({
      houseId,
      userId: currentUser.userId,
    });

    return { message: "House unliked successfully" };
  }

  // @Security("jwt")
  @SuccessResponse(201, "Order Created")
  @Post("orders")
  public async createOrder(
    @Request() req: Express.Request,
    @Path() houseId: number,
    @Res() notFoundResponse: TsoaResponse<404, { message: string }>
  ): Promise<OrderResponse> {
    // const currentUser = req.user as JwtPayload;
    const currentUser = getCurrentUser();

    const house = await AppDataSource.getRepository(House).findOneBy({
      id: houseId,
    });
    if (!house) return notFoundResponse(404, { message: "House not found." });

    const user = await AppDataSource.getRepository(User).findOneBy({
      id: currentUser.userId,
    });
    if (!user) throw new Error("User not found");

    const order = Order.create({
      userId: user.id,
      houseId: house.id,
      user,
      house: house,
    });
    const saved = await order.save();

    return {
      id: saved.id,
      price: house.price,
      userId: saved.userId,
      houseId: saved.houseId,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: saved.createdAt,
      houseImageUrl: house.imageUrl,
      houseCaption: house.caption || "",
      houseAddress: house.address || "",
      houseState: house.state || "",
      houseCity: house.city || "",
      houseZipCode: house.zipCode || "",
      houseSize: house.size || "",
      housePrice: house.price || 0,
    };
  }

  @Get("orders")
  public async getOrders(
    @Path() houseId: number,
    @Query() limit: number = 10,
    @Query() offset: number = 0,
    @Res() notFoundResponse: TsoaResponse<404, { message: string }>
  ): Promise<OrderResponse[]> {
    const house = await AppDataSource.getRepository(House).findOneBy({
      id: houseId,
    });
    if (!house) return notFoundResponse(404, { message: "Post not found." });

    const orders = await AppDataSource.getRepository(Order).find({
      where: { houseId },
      relations: ["user"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

    return orders.map((order) => ({
      id: order.id,
      price: house.price,
      userId: order.userId,
      houseId: order.houseId,
      username: order.user?.username || "unknown",
      avatarUrl: order.user?.avatarUrl || null,
      createdAt: order.createdAt,
      houseImageUrl: house.imageUrl,
      houseCaption: house.caption || "",
      houseAddress: house.address || "",
      houseState: house.state || "",
      houseCity: house.city || "",
      houseZipCode: house.zipCode || "",
      houseSize: house.size || "",
      housePrice: house.price || 0,
    }));
  }
}
