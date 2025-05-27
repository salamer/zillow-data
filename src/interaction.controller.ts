import {
  Post as HttpPost,
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

export interface OrderResponse {
  id: number;
  price: number;
  userId: number;
  houseId: number;
  username: string;
  avatarUrl: string | null;
  createdAt: Date;
}

@Route("houses/{houseId}")
@Tags("Interactions (Likes & Orders)")
export class InteractionController extends Controller {
  @Security("jwt")
  @SuccessResponse(201, "Liked")
  @HttpPost("like")
  public async likeHouse(
    @Request() req: Express.Request,
    @Path() houseId: number,
    @Res() notFoundResponse: TsoaResponse<404, { message: string }>
  ): Promise<{ message: string }> {
    const currentUser = req.user as JwtPayload;

    const post = await AppDataSource.getRepository(House).findOneBy({
      id: houseId,
    });
    if (!post) return notFoundResponse(404, { message: "Post not found." });

    const user = await AppDataSource.getRepository(User).findOneBy({
      id: currentUser.userId,
    });
    if (!user) throw new Error("User not found");

    const like = Like.create({ house: post, user, houseId, userId: user.id });
    await like.save();

    return { message: "Post liked successfully" };
  }

  @Security("jwt")
  @SuccessResponse(200, "Unliked")
  @Delete("unlike")
  public async unlikePost(
    @Request() req: Express.Request,
    @Path() houseId: number
  ): Promise<{ message: string }> {
    const currentUser = req.user as JwtPayload;

    await AppDataSource.getRepository(Like).delete({
      houseId,
      userId: currentUser.userId,
    });

    return { message: "Post unliked successfully" };
  }

  @Security("jwt")
  @SuccessResponse(201, "Order Created")
  @HttpPost("orders")
  public async createOrder(
    @Request() req: Express.Request,
    @Path() houseId: number,
    @Res() notFoundResponse: TsoaResponse<404, { message: string }>
  ): Promise<OrderResponse> {
    const currentUser = req.user as JwtPayload;

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
    }));
  }
}
